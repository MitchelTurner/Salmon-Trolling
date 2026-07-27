/**
 * Probe sample ingest (07-probe.md / task 6.2).
 * Join samples to track + rig timeline; apply clock offset at ingest.
 */

export type TrackPointRef = {
  readonly t: string; // ISO
  readonly lat: number;
  readonly lon: number;
};

export type RigTimelineEntry = {
  /** Inclusive start of this rig being active. */
  readonly from: string;
  readonly to?: string;
  readonly rigSnapshot: Record<string, unknown>;
};

export type RawProbeSample = {
  readonly tOffsetMs: number;
  readonly depthM: number;
  readonly tempC?: number;
  readonly speedMs?: number;
};

export type IngestedProbeSample = {
  readonly t: string;
  readonly depthM: number;
  readonly tempC?: number;
  readonly speedMs?: number;
  readonly clockOffsetMs: number;
  readonly lat?: number;
  readonly lon?: number;
  readonly rigSnapshot?: Record<string, unknown>;
};

export type IngestProbeSessionInput = {
  readonly sessionStartedAt: string;
  readonly clockOffsetMs: number;
  readonly samples: readonly RawProbeSample[];
  readonly track: readonly TrackPointRef[];
  readonly rigTimeline: readonly RigTimelineEntry[];
};

function parseMs(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`invalid time: ${iso}`);
  return ms;
}

/** Nearest track point within maxDeltaMs (default 5s). */
export function nearestTrackPoint(
  track: readonly TrackPointRef[],
  tMs: number,
  maxDeltaMs = 5_000,
): TrackPointRef | null {
  if (track.length === 0) return null;
  let best: TrackPointRef | null = null;
  let bestDelta = Infinity;
  for (const p of track) {
    const d = Math.abs(parseMs(p.t) - tMs);
    if (d < bestDelta) {
      bestDelta = d;
      best = p;
    }
  }
  if (best == null || bestDelta > maxDeltaMs) return null;
  return best;
}

export function rigAt(
  timeline: readonly RigTimelineEntry[],
  tMs: number,
): Record<string, unknown> | undefined {
  let match: RigTimelineEntry | undefined;
  for (const entry of timeline) {
    const from = parseMs(entry.from);
    const to = entry.to != null ? parseMs(entry.to) : Infinity;
    if (tMs >= from && tMs < to) {
      match = entry;
    }
  }
  return match?.rigSnapshot;
}

/**
 * Correct device timestamps with phone-synced offset, then join track + rig.
 * Positions are optional — contributor consent may omit them later.
 */
export function ingestProbeSession(
  input: IngestProbeSessionInput,
): IngestedProbeSample[] {
  const sessionStart = parseMs(input.sessionStartedAt);
  const out: IngestedProbeSample[] = [];

  for (const s of input.samples) {
    // Device logged tOffset from its RTC; apply offset at ingest, not on device.
    const correctedMs =
      sessionStart + s.tOffsetMs + input.clockOffsetMs;
    const t = new Date(correctedMs).toISOString();
    const track = nearestTrackPoint(input.track, correctedMs);
    const rigSnapshot = rigAt(input.rigTimeline, correctedMs);

    out.push({
      t,
      depthM: s.depthM,
      tempC: s.tempC,
      speedMs: s.speedMs,
      clockOffsetMs: input.clockOffsetMs,
      lat: track?.lat,
      lon: track?.lon,
      rigSnapshot,
    });
  }

  return out;
}
