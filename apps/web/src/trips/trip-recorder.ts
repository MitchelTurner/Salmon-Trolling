import { getLocalDb, type TrollDatabase } from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { writeLocal } from '../db/write.js';
import type { EffortRecord, TrackPointRecord, TripRecord } from '../db/types.js';
import {
  PERSIST_INTERVAL_MS,
  RING_BUFFER_CAPACITY,
  SAMPLE_INTERVAL_MS,
  SIMPLIFY_EPSILON_M,
} from './constants.js';
import { douglasPeucker } from './douglas-peucker.js';
import { RingBuffer } from './ring-buffer.js';
import type {
  Clock,
  GeoPositionSource,
  GeoWatchHandle,
  PositionSample,
  TripRecorderStatus,
  VisibilityApi,
} from './types.js';

export type TripRecorderDeps = {
  orgId: string;
  boatId?: string;
  geo: GeoPositionSource;
  clock: Clock;
  visibility: VisibilityApi;
  db?: TrollDatabase;
  persistIntervalMs?: number;
  sampleIntervalMs?: number;
  simplifyEpsilonM?: number;
  onLiveSample?: (sample: PositionSample | null) => void;
  onStatus?: (status: TripRecorderStatus, detail?: string) => void;
};

export type ClosedTripResult = {
  trip: TripRecord;
  pointsBefore: number;
  pointsAfter: number;
  /** Populated by session close after effort is recorded. */
  effort?: EffortRecord;
};

/**
 * Active trip recorder.
 * - 1 Hz samples into an in-memory ring buffer (live display)
 * - Persist every 10 s to IndexedDB + syncQueue
 * - On screen hide / pagehide: flush immediately so screen-off still lands points
 * - On close: Douglas-Peucker simplify and drop discarded points + their sync ops
 */
export class TripRecorder {
  private readonly orgId: string;
  private readonly boatId?: string;
  private readonly geo: GeoPositionSource;
  private readonly clock: Clock;
  private readonly visibility: VisibilityApi;
  private readonly db: TrollDatabase;
  private readonly persistIntervalMs: number;
  private readonly sampleIntervalMs: number;
  private readonly simplifyEpsilonM: number;
  private readonly onLiveSample?: (sample: PositionSample | null) => void;
  private readonly onStatus?: (status: TripRecorderStatus, detail?: string) => void;

  private readonly ring = new RingBuffer<PositionSample>(RING_BUFFER_CAPACITY);
  private latestRaw: PositionSample | null = null;
  private trip: TripRecord | null = null;
  private watch: GeoWatchHandle | null = null;
  private sampleTimer: { clear: () => void } | null = null;
  private persistTimer: { clear: () => void } | null = null;
  private removeVisibility: (() => void) | null = null;
  private lastPersistedMs = 0;
  private status: TripRecorderStatus = 'idle';

  constructor(deps: TripRecorderDeps) {
    this.orgId = deps.orgId;
    this.boatId = deps.boatId;
    this.geo = deps.geo;
    this.clock = deps.clock;
    this.visibility = deps.visibility;
    this.db = deps.db ?? getLocalDb();
    this.persistIntervalMs = deps.persistIntervalMs ?? PERSIST_INTERVAL_MS;
    this.sampleIntervalMs = deps.sampleIntervalMs ?? SAMPLE_INTERVAL_MS;
    this.simplifyEpsilonM = deps.simplifyEpsilonM ?? SIMPLIFY_EPSILON_M;
    this.onLiveSample = deps.onLiveSample;
    this.onStatus = deps.onStatus;
  }

  getStatus(): TripRecorderStatus {
    return this.status;
  }

  getTrip(): TripRecord | null {
    return this.trip;
  }

  getRingSamples(): PositionSample[] {
    return this.ring.toArray();
  }

  async start(): Promise<TripRecord> {
    if (this.trip && !this.trip.closedAt) {
      throw new Error('a trip is already recording');
    }

    const startedAt = new Date(this.clock.now()).toISOString();
    const trip: TripRecord = {
      id: ulid(this.clock.now()),
      orgId: this.orgId,
      boatId: this.boatId,
      startedAt,
    };

    await writeLocal('trips', trip, {
      orgId: this.orgId,
      opType: 'create',
      db: this.db,
      clientTime: startedAt,
    });

    this.trip = trip;
    this.ring.clear();
    this.latestRaw = null;
    this.lastPersistedMs = 0;
    this.setStatus('recording');

    this.watch = this.geo.watch(
      (sample) => {
        this.latestRaw = sample;
      },
      (err) => {
        this.setStatus('error', err.message);
      },
    );

    this.sampleTimer = this.clock.setInterval(() => {
      this.sampleTick();
    }, this.sampleIntervalMs);

    this.persistTimer = this.clock.setInterval(() => {
      void this.persistLatest('interval');
    }, this.persistIntervalMs);

    this.removeVisibility = this.visibility.addListener(() => {
      if (this.visibility.isHidden()) {
        void this.persistLatest('visibility');
      }
    });

    // Seed immediately if a fix is already available.
    this.sampleTick();
    await this.persistLatest('start');

    return trip;
  }

  async close(): Promise<ClosedTripResult> {
    if (!this.trip || this.trip.closedAt) {
      throw new Error('no open trip to close');
    }

    this.setStatus('closing');
    this.stopTimers();
    await this.persistLatest('close');

    const tripId = this.trip.id;
    const existing = await this.db.trackPoints
      .where('tripId')
      .equals(tripId)
      .sortBy('t');
    const pointsBefore = existing.length;

    const simplified = douglasPeucker(
      existing.map((p) => ({
        ...p,
        lon: p.geom.coordinates[0],
        lat: p.geom.coordinates[1],
      })),
      this.simplifyEpsilonM,
    );
    const keepIds = new Set(simplified.map((p) => p.id));
    const dropIds = existing.filter((p) => !keepIds.has(p.id)).map((p) => p.id);

    if (dropIds.length > 0) {
      await this.db.transaction('rw', this.db.trackPoints, this.db.syncQueue, async () => {
        await this.db.trackPoints.bulkDelete(dropIds);
        const pending = await this.db.syncQueue
          .where('orgId')
          .equals(this.orgId)
          .toArray();
        const dropOps = pending
          .filter(
            (op) =>
              op.entity === 'TrackPoint' &&
              typeof op.payload.id === 'string' &&
              dropIds.includes(op.payload.id),
          )
          .map((op) => op.id);
        if (dropOps.length > 0) {
          await this.db.syncQueue.bulkDelete(dropOps);
        }
      });
    }

    const closedAt = new Date(this.clock.now()).toISOString();
    const closed: TripRecord = { ...this.trip, closedAt };
    await writeLocal('trips', closed, {
      orgId: this.orgId,
      opType: 'update',
      db: this.db,
      clientTime: closedAt,
    });

    this.trip = closed;
    this.ring.clear();
    this.latestRaw = null;
    this.onLiveSample?.(null);
    this.setStatus('idle');

    return {
      trip: closed,
      pointsBefore,
      pointsAfter: pointsBefore - dropIds.length,
    };
  }

  dispose(): void {
    this.stopTimers();
    this.ring.clear();
    this.latestRaw = null;
    this.trip = null;
    this.setStatus('idle');
  }

  private sampleTick(): void {
    if (!this.latestRaw) return;
    // 1 Hz ring sample: keep the newest raw fix each tick.
    this.ring.push(this.latestRaw);
    this.onLiveSample?.(this.latestRaw);
  }

  private async persistLatest(
    _reason: 'interval' | 'visibility' | 'start' | 'close',
  ): Promise<void> {
    const trip = this.trip;
    if (!trip || trip.closedAt) return;

    const sample = this.ring.latest() ?? this.latestRaw;
    if (!sample) return;

    if (
      this.lastPersistedMs > 0 &&
      sample.tMs - this.lastPersistedMs < this.persistIntervalMs * 0.5 &&
      _reason === 'interval'
    ) {
      return;
    }

    // Avoid writing the exact same timestamp twice on rapid flush.
    if (sample.tMs === this.lastPersistedMs) return;

    const point: TrackPointRecord = {
      id: ulid(sample.tMs),
      tripId: trip.id,
      t: new Date(sample.tMs).toISOString(),
      geom: { type: 'Point', coordinates: [sample.lon, sample.lat] },
      sogMs: sample.sogMs,
      cogRad: sample.cogRad,
      headingRad: sample.headingRad,
      stwMs: sample.stwMs,
      soundingM: sample.soundingM,
      seaTempC: sample.seaTempC,
    };

    await writeLocal('trackPoints', point, {
      orgId: this.orgId,
      opType: 'create',
      db: this.db,
      clientTime: point.t,
    });

    this.lastPersistedMs = sample.tMs;
  }

  private stopTimers(): void {
    this.watch?.clear();
    this.watch = null;
    this.sampleTimer?.clear();
    this.sampleTimer = null;
    this.persistTimer?.clear();
    this.persistTimer = null;
    this.removeVisibility?.();
    this.removeVisibility = null;
  }

  private setStatus(status: TripRecorderStatus, detail?: string): void {
    this.status = status;
    this.onStatus?.(status, detail);
  }
}
