/**
 * BLE probe client (07-probe.md).
 * Real Web Bluetooth adapter later; FakeBleProbe drives tests and offline demos.
 *
 * GATT characteristics:
 * - deviceInfo, sessionList, sessionData (notify chunks), timeSync (write offset)
 */

import {
  makeChunk,
  packSession,
  unpackSession,
  verifyChunk,
  type DataChunk,
  type ProbeSampleBinary,
  type ProbeSessionMeta,
} from './protocol.js';

export type ProbeDeviceInfo = {
  readonly serial: string;
  readonly firmware: string;
  readonly batteryPct: number;
};

export type TransferProgress = {
  readonly sessionId: string;
  readonly bytesReceived: number;
  readonly totalBytes: number;
};

export interface ProbeBleClient {
  connect(): Promise<ProbeDeviceInfo>;
  disconnect(): Promise<void>;
  listSessions(): Promise<ProbeSessionMeta[]>;
  /**
   * Pull session bytes with CRC-checked chunks. Resume from `resumeOffset`
   * (byte offset into packed session).
   */
  transferSession(
    sessionId: string,
    options?: {
      resumeOffset?: number;
      chunkSize?: number;
      onProgress?: (p: TransferProgress) => void;
    },
  ): Promise<ProbeSampleBinary[]>;
  /**
   * Write phone time. Device stores an offset — never rewrites logged timestamps.
   */
  syncTime(phoneUnixMs: number): Promise<{ clockOffsetMs: number }>;
  getClockOffsetMs(): number;
}

type FakeSession = ProbeSessionMeta & {
  readonly samples: ProbeSampleBinary[];
  readonly packed: Uint8Array;
};

/**
 * In-memory probe for tests — models session list, chunked CRC transfer, time offset.
 */
export class FakeBleProbe implements ProbeBleClient {
  private connected = false;
  private clockOffsetMs = 0;
  private readonly sessions = new Map<string, FakeSession>();
  /** Simulate a drop after N bytes once (for resume tests). */
  failAfterBytes: number | null = null;

  seedSession(
    meta: ProbeSessionMeta,
    samples: readonly ProbeSampleBinary[],
  ): void {
    this.sessions.set(meta.sessionId, {
      ...meta,
      sampleCount: samples.length,
      samples: [...samples],
      packed: packSession(samples),
    });
  }

  async connect(): Promise<ProbeDeviceInfo> {
    this.connected = true;
    return {
      serial: 'PROBE-FAKE-001',
      firmware: '0.1.0-fake',
      batteryPct: 88,
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listSessions(): Promise<ProbeSessionMeta[]> {
    this.assertConnected();
    return [...this.sessions.values()].map(
      ({ sessionId, startedAt, sampleCount }) => ({
        sessionId,
        startedAt,
        sampleCount,
      }),
    );
  }

  async transferSession(
    sessionId: string,
    options: {
      resumeOffset?: number;
      chunkSize?: number;
      onProgress?: (p: TransferProgress) => void;
    } = {},
  ): Promise<ProbeSampleBinary[]> {
    this.assertConnected();
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('session not found');

    const chunkSize = options.chunkSize ?? 240;
    let offset = options.resumeOffset ?? 0;
    if (offset < 0 || offset > session.packed.length) {
      throw new Error('invalid resume offset');
    }
    if (offset % 12 !== 0) {
      throw new Error('resume offset must align to sample boundary');
    }

    const received: number[] = [];
    while (offset < session.packed.length) {
      if (
        this.failAfterBytes != null &&
        offset >= this.failAfterBytes &&
        offset > (options.resumeOffset ?? 0)
      ) {
        this.failAfterBytes = null;
        throw new Error('link dropped');
      }
      const end = Math.min(offset + chunkSize, session.packed.length);
      const payload = session.packed.slice(offset, end);
      const chunk: DataChunk = makeChunk(sessionId, offset, payload);
      if (!verifyChunk(chunk)) {
        throw new Error('CRC mismatch');
      }
      for (let i = 0; i < payload.length; i++) {
        received[offset + i] = payload[i]!;
      }
      offset = end;
      options.onProgress?.({
        sessionId,
        bytesReceived: offset,
        totalBytes: session.packed.length,
      });
    }

    const bytes = new Uint8Array(session.packed.length);
    for (let i = 0; i < received.length; i++) {
      bytes[i] = received[i] ?? 0;
    }
    // Only unpack the full buffer when complete from 0.
    if ((options.resumeOffset ?? 0) > 0) {
      // Caller is responsible for assembling; for Fake we re-read packed.
      return unpackSession(session.packed);
    }
    return unpackSession(bytes);
  }

  /**
   * Resume helper: pull remaining bytes after a drop and merge with prior prefix.
   */
  async transferSessionResumable(
    sessionId: string,
    chunkSize = 240,
  ): Promise<ProbeSampleBinary[]> {
    this.assertConnected();
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('session not found');

    const assembled = new Uint8Array(session.packed.length);
    let offset = 0;
    while (offset < session.packed.length) {
      try {
        const endTarget = session.packed.length;
        while (offset < endTarget) {
          if (
            this.failAfterBytes != null &&
            offset >= this.failAfterBytes
          ) {
            this.failAfterBytes = null;
            throw new Error('link dropped');
          }
          const end = Math.min(offset + chunkSize, session.packed.length);
          const payload = session.packed.slice(offset, end);
          const chunk = makeChunk(sessionId, offset, payload);
          if (!verifyChunk(chunk)) throw new Error('CRC mismatch');
          assembled.set(payload, offset);
          offset = end;
        }
      } catch (err) {
        if (!(err instanceof Error) || err.message !== 'link dropped') {
          throw err;
        }
        // resume from current offset
      }
    }
    return unpackSession(assembled);
  }

  async syncTime(phoneUnixMs: number): Promise<{ clockOffsetMs: number }> {
    this.assertConnected();
    // Device RTC is "behind" by a fixed skew in the fake; offset = phone - device.
    const deviceUnixMs = phoneUnixMs - 1500;
    this.clockOffsetMs = phoneUnixMs - deviceUnixMs;
    return { clockOffsetMs: this.clockOffsetMs };
  }

  getClockOffsetMs(): number {
    return this.clockOffsetMs;
  }

  private assertConnected(): void {
    if (!this.connected) throw new Error('probe not connected');
  }
}
