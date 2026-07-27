/**
 * Probe BLE sample packing (07-probe.md).
 * Binary, not JSON — 1 Hz sessions are large for a boat link.
 */

import { crc32 } from './crc.js';

/** Packed sample: tOffsetMs u32, depthMm u32, tempMilliC i16, speedMmPerS u16 */
export const SAMPLE_BYTES = 12;

export type ProbeSampleBinary = {
  readonly tOffsetMs: number;
  readonly depthM: number;
  readonly tempC: number;
  readonly speedMs: number;
};

export type ProbeSessionMeta = {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly sampleCount: number;
};

export type DataChunk = {
  readonly sessionId: string;
  readonly offset: number;
  readonly payload: Uint8Array;
  readonly crc: number;
};

export function packSample(s: ProbeSampleBinary): Uint8Array {
  const buf = new ArrayBuffer(SAMPLE_BYTES);
  const view = new DataView(buf);
  view.setUint32(0, s.tOffsetMs >>> 0, true);
  view.setUint32(4, Math.round(s.depthM * 1000) >>> 0, true);
  view.setInt16(8, Math.round(s.tempC * 1000), true);
  view.setUint16(10, Math.round(s.speedMs * 1000) >>> 0, true);
  return new Uint8Array(buf);
}

export function unpackSample(bytes: Uint8Array, at = 0): ProbeSampleBinary {
  const view = new DataView(bytes.buffer, bytes.byteOffset + at, SAMPLE_BYTES);
  return {
    tOffsetMs: view.getUint32(0, true),
    depthM: view.getUint32(4, true) / 1000,
    tempC: view.getInt16(8, true) / 1000,
    speedMs: view.getUint16(10, true) / 1000,
  };
}

export function packSession(samples: readonly ProbeSampleBinary[]): Uint8Array {
  const out = new Uint8Array(samples.length * SAMPLE_BYTES);
  for (let i = 0; i < samples.length; i++) {
    out.set(packSample(samples[i]!), i * SAMPLE_BYTES);
  }
  return out;
}

export function unpackSession(bytes: Uint8Array): ProbeSampleBinary[] {
  if (bytes.length % SAMPLE_BYTES !== 0) {
    throw new Error('session payload length not a multiple of sample size');
  }
  const n = bytes.length / SAMPLE_BYTES;
  const out: ProbeSampleBinary[] = [];
  for (let i = 0; i < n; i++) {
    out.push(unpackSample(bytes, i * SAMPLE_BYTES));
  }
  return out;
}

export function makeChunk(
  sessionId: string,
  offset: number,
  payload: Uint8Array,
): DataChunk {
  return {
    sessionId,
    offset,
    payload,
    crc: crc32(payload),
  };
}

export function verifyChunk(chunk: DataChunk): boolean {
  return crc32(chunk.payload) === chunk.crc;
}
