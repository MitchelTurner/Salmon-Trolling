import { describe, expect, it } from 'vitest';
import { FakeBleProbe } from './ble-client.js';
import { crc32 } from './crc.js';
import {
  makeChunk,
  packSample,
  unpackSample,
  verifyChunk,
  type ProbeSampleBinary,
} from './protocol.js';

function samples(n: number): ProbeSampleBinary[] {
  const out: ProbeSampleBinary[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      tOffsetMs: i * 1000,
      depthM: 10 + i * 0.1,
      tempC: 8.5,
      speedMs: 1.2,
    });
  }
  return out;
}

describe('probe binary protocol', () => {
  it('round-trips a packed sample', () => {
    const s: ProbeSampleBinary = {
      tOffsetMs: 42_000,
      depthM: 25.5,
      tempC: 9.125,
      speedMs: 1.5,
    };
    const again = unpackSample(packSample(s));
    expect(again.tOffsetMs).toBe(42_000);
    expect(again.depthM).toBeCloseTo(25.5, 3);
    expect(again.tempC).toBeCloseTo(9.125, 3);
    expect(again.speedMs).toBeCloseTo(1.5, 3);
  });

  it('CRC detects corruption', () => {
    const payload = packSample(samples(1)[0]!);
    const chunk = makeChunk('s1', 0, payload);
    expect(verifyChunk(chunk)).toBe(true);
    payload[0] = (payload[0]! + 1) & 0xff;
    expect(crc32(payload)).not.toBe(chunk.crc);
  });
});

describe('FakeBleProbe', () => {
  it('lists sessions and transfers with CRC chunks', async () => {
    const probe = new FakeBleProbe();
    const data = samples(50);
    probe.seedSession(
      {
        sessionId: 'sess_1',
        startedAt: '2026-07-27T14:00:00.000Z',
        sampleCount: data.length,
      },
      data,
    );

    const info = await probe.connect();
    expect(info.serial).toContain('PROBE');

    const list = await probe.listSessions();
    expect(list).toHaveLength(1);
    expect(list[0]?.sampleCount).toBe(50);

    const pulled = await probe.transferSession('sess_1', { chunkSize: 36 });
    expect(pulled).toHaveLength(50);
    expect(pulled[0]?.depthM).toBeCloseTo(10, 3);
    expect(pulled[49]?.tOffsetMs).toBe(49_000);
  });

  it('resumes after a link drop', async () => {
    const probe = new FakeBleProbe();
    const data = samples(100);
    probe.seedSession(
      {
        sessionId: 'sess_2',
        startedAt: '2026-07-27T15:00:00.000Z',
        sampleCount: data.length,
      },
      data,
    );
    await probe.connect();
    probe.failAfterBytes = 240;
    const pulled = await probe.transferSessionResumable('sess_2', 120);
    expect(pulled).toHaveLength(100);
  });

  it('applies time sync as an offset without rewriting samples', async () => {
    const probe = new FakeBleProbe();
    await probe.connect();
    const { clockOffsetMs } = await probe.syncTime(1_700_000_000_000);
    expect(clockOffsetMs).toBe(1500);
    expect(probe.getClockOffsetMs()).toBe(1500);
  });
});
