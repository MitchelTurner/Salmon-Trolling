import { COOPS_TTL } from './ttl.js';
import type {
  CurrentPredictions,
  TidePredictions,
  WaterLevelObservation,
  WaterTemperatureObservation,
} from './types.js';

/** CO-OPS returns "YYYY-MM-DD HH:mm" in the requested time zone (we use GMT). */
export function coopsTimeToIso(t: string): string {
  const normalized = t.includes('T') ? t : t.replace(' ', 'T');
  const withZ = /Z$/i.test(normalized) ? normalized : `${normalized}Z`;
  const ms = Date.parse(withZ);
  if (Number.isNaN(ms)) {
    throw new Error(`invalid CO-OPS timestamp: ${t}`);
  }
  return new Date(ms).toISOString();
}

type RawPredictions = {
  predictions?: Array<{ t: string; v: string }>;
  error?: { message?: string };
};

type RawObs = {
  metadata?: { id?: string; name?: string };
  data?: Array<{ t: string; v: string; s?: string; q?: string }>;
  error?: { message?: string };
};

type RawCurrents = {
  current_predictions?: {
    units?: string;
    cp?: Array<{
      Type: string;
      Time: string;
      Velocity_Major: number;
      meanFloodDir?: number;
      meanEbbDir?: number;
    }>;
  };
  error?: { message?: string };
};

function assertNoError(body: { error?: { message?: string } }, label: string): void {
  if (body.error?.message) {
    throw new Error(`CO-OPS ${label}: ${body.error.message}`);
  }
}

export function parseTidePredictions(
  body: unknown,
  meta: {
    stationId: string;
    beginDate: string;
    endDate: string;
    fetchedAt: string;
  },
): TidePredictions {
  const raw = body as RawPredictions;
  assertNoError(raw, 'predictions');
  const rows = raw.predictions;
  if (!rows?.length) {
    throw new Error('CO-OPS predictions: empty response');
  }
  return {
    stationId: meta.stationId,
    fetchedAt: meta.fetchedAt,
    beginDate: meta.beginDate,
    endDate: meta.endDate,
    cacheTtlMs: COOPS_TTL.predictionsMs,
    predictions: rows.map((row) => ({
      t: coopsTimeToIso(row.t),
      heightM: Number(row.v),
    })),
  };
}

export function parseWaterLevel(
  body: unknown,
  meta: { stationId: string; fetchedAt: string },
): WaterLevelObservation {
  const raw = body as RawObs;
  assertNoError(raw, 'water_level');
  const row = raw.data?.[0];
  if (!row) throw new Error('CO-OPS water_level: empty response');
  return {
    stationId: raw.metadata?.id ?? meta.stationId,
    stationName: raw.metadata?.name,
    fetchedAt: meta.fetchedAt,
    t: coopsTimeToIso(row.t),
    heightM: Number(row.v),
    sigmaM: row.s !== undefined ? Number(row.s) : undefined,
    quality: row.q,
    cacheTtlMs: COOPS_TTL.observationsMs,
  };
}

export function parseWaterTemperature(
  body: unknown,
  meta: { stationId: string; fetchedAt: string },
): WaterTemperatureObservation {
  const raw = body as RawObs;
  assertNoError(raw, 'water_temperature');
  const row = raw.data?.[0];
  if (!row) throw new Error('CO-OPS water_temperature: empty response');
  return {
    stationId: raw.metadata?.id ?? meta.stationId,
    stationName: raw.metadata?.name,
    fetchedAt: meta.fetchedAt,
    t: coopsTimeToIso(row.t),
    tempC: Number(row.v),
    cacheTtlMs: COOPS_TTL.observationsMs,
  };
}

export function parseCurrentPredictions(
  body: unknown,
  meta: {
    stationId: string;
    beginDate: string;
    endDate: string;
    fetchedAt: string;
  },
): CurrentPredictions {
  const raw = body as RawCurrents;
  assertNoError(raw, 'currents_predictions');
  const block = raw.current_predictions;
  const rows = block?.cp;
  if (!rows?.length) {
    throw new Error('CO-OPS currents_predictions: empty response');
  }
  return {
    stationId: meta.stationId,
    fetchedAt: meta.fetchedAt,
    beginDate: meta.beginDate,
    endDate: meta.endDate,
    units: block?.units ?? 'meters, cm/s',
    cacheTtlMs: COOPS_TTL.predictionsMs,
    predictions: rows.map((row) => ({
      t: coopsTimeToIso(row.Time),
      type: row.Type,
      velocityMajorCms: row.Velocity_Major,
      meanFloodDirDeg: row.meanFloodDir,
      meanEbbDirDeg: row.meanEbbDir,
    })),
  };
}
