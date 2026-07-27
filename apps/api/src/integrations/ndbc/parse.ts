import { NDBC_TTL } from './ttl.js';
import type {
  NdbcGap,
  NdbcObservation,
  NdbcStationObservations,
} from './types.js';

const MM = 'MM';

/** Expected cadence for standard buoy meteorological rows. */
export const NDBC_EXPECTED_INTERVAL_MS = 60 * 60 * 1000;

/** Flag a gap when the step exceeds 1.5× the expected interval. */
export const NDBC_GAP_THRESHOLD_MS = NDBC_EXPECTED_INTERVAL_MS * 1.5;

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === MM || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function rowTimeIso(
  yy: string,
  mm: string,
  dd: string,
  hh: string,
  min: string,
): string {
  const year = Number(yy);
  const fullYear = year < 100 ? 2000 + year : year;
  const iso = `${String(fullYear).padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min.padStart(2, '0')}:00.000Z`;
  if (Number.isNaN(Date.parse(iso))) {
    throw new Error(`invalid NDBC timestamp: ${yy} ${mm} ${dd} ${hh} ${min}`);
  }
  return iso;
}

/**
 * Parse NDBC realtime2 text. Missing fields stay undefined — never invent values.
 */
export function parseRealtimeText(text: string): NdbcObservation[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.filter((line) => !line.startsWith('#'));
  const observations: NdbcObservation[] = [];

  for (const line of dataLines) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5) continue;
    const [yy, mm, dd, hh, min] = cols;
    observations.push({
      t: rowTimeIso(yy!, mm!, dd!, hh!, min!),
      windDirDeg: parseOptionalNumber(cols[5]),
      windSpeedMs: parseOptionalNumber(cols[6]),
      gustMs: parseOptionalNumber(cols[7]),
      waveHeightM: parseOptionalNumber(cols[8]),
      dominantPeriodS: parseOptionalNumber(cols[9]),
      averagePeriodS: parseOptionalNumber(cols[10]),
      meanWaveDirDeg: parseOptionalNumber(cols[11]),
      pressureHpa: parseOptionalNumber(cols[12]),
      airTempC: parseOptionalNumber(cols[13]),
      waterTempC: parseOptionalNumber(cols[14]),
      dewpointC: parseOptionalNumber(cols[15]),
    });
  }

  // NDBC realtime files are newest-first; expose chronological order.
  return observations.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
}

/**
 * Detect gaps. Never invent in-between samples.
 */
export function detectGaps(
  observations: readonly NdbcObservation[],
  thresholdMs: number = NDBC_GAP_THRESHOLD_MS,
): NdbcGap[] {
  const gaps: NdbcGap[] = [];
  for (let i = 1; i < observations.length; i += 1) {
    const prev = observations[i - 1]!;
    const next = observations[i]!;
    const gapMs = Date.parse(next.t) - Date.parse(prev.t);
    if (gapMs > thresholdMs) {
      gaps.push({ after: prev.t, before: next.t, gapMs });
    }
  }
  return gaps;
}

export function parseStationObservations(
  text: string,
  meta: { stationId: string; fetchedAt: string; limit?: number },
): NdbcStationObservations {
  let observations = parseRealtimeText(text);
  if (meta.limit !== undefined) {
    observations = observations.slice(-meta.limit);
  }
  return {
    stationId: meta.stationId,
    fetchedAt: meta.fetchedAt,
    observations,
    gaps: detectGaps(observations),
    cacheTtlMs: NDBC_TTL.observationsMs,
  };
}
