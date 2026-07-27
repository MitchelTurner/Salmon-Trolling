import { OPEN_METEO_TTL } from './ttl.js';
import type {
  OpenMeteoMarineForecast,
  OpenMeteoMarineHourly,
} from './types.js';

type RawMarineResponse = {
  latitude: number;
  longitude: number;
  timezone?: string;
  hourly?: {
    time: string[];
    wave_height?: Array<number | null>;
    wave_direction?: Array<number | null>;
    wave_period?: Array<number | null>;
    swell_wave_height?: Array<number | null>;
    swell_wave_direction?: Array<number | null>;
    swell_wave_period?: Array<number | null>;
    sea_surface_temperature?: Array<number | null>;
  };
  reason?: string;
  error?: boolean;
};

function optionalAt(
  series: Array<number | null> | undefined,
  index: number,
): number | undefined {
  const v = series?.[index];
  return v === null || v === undefined ? undefined : v;
}

function hourToIso(t: string): string {
  // Open-Meteo returns "YYYY-MM-DDTHH:00" (no seconds / Z).
  const normalized = /Z$/i.test(t)
    ? t
    : t.length === 16
      ? `${t}:00.000Z`
      : `${t}Z`;
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) throw new Error(`invalid Open-Meteo time: ${t}`);
  return new Date(ms).toISOString();
}

export function parseOpenMeteoMarine(
  body: unknown,
  fetchedAt: string,
): OpenMeteoMarineForecast {
  const raw = body as RawMarineResponse;
  if (raw.error) {
    throw new Error(`Open-Meteo marine: ${raw.reason ?? 'unknown error'}`);
  }
  const hourly = raw.hourly;
  if (!hourly?.time?.length) {
    throw new Error('Open-Meteo marine: empty hourly series');
  }

  const samples: OpenMeteoMarineHourly[] = hourly.time.map((t, i) => ({
    t: hourToIso(t),
    waveHeightM: optionalAt(hourly.wave_height, i),
    waveDirDeg: optionalAt(hourly.wave_direction, i),
    wavePeriodS: optionalAt(hourly.wave_period, i),
    swellHeightM: optionalAt(hourly.swell_wave_height, i),
    swellDirDeg: optionalAt(hourly.swell_wave_direction, i),
    swellPeriodS: optionalAt(hourly.swell_wave_period, i),
    seaSurfaceTempC: optionalAt(hourly.sea_surface_temperature, i),
  }));

  return {
    lat: raw.latitude,
    lon: raw.longitude,
    fetchedAt,
    timezone: raw.timezone ?? 'UTC',
    hourly: samples,
    cacheTtlMs: OPEN_METEO_TTL.marineMs,
  };
}
