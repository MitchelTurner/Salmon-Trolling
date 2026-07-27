export type OpenMeteoMarineHourly = {
  readonly t: string;
  readonly waveHeightM?: number;
  readonly waveDirDeg?: number;
  readonly wavePeriodS?: number;
  readonly swellHeightM?: number;
  readonly swellDirDeg?: number;
  readonly swellPeriodS?: number;
  readonly seaSurfaceTempC?: number;
};

export type OpenMeteoMarineForecast = {
  readonly lat: number;
  readonly lon: number;
  readonly fetchedAt: string;
  readonly timezone: string;
  readonly hourly: readonly OpenMeteoMarineHourly[];
  readonly cacheTtlMs: number;
};

export type OpenMeteoMarineQuery = {
  readonly lat: number;
  readonly lon: number;
  /** Forecast horizon in hours (default 48). */
  readonly forecastHours?: number;
};

/**
 * Open-Meteo Marine integration boundary.
 * Gap-filler for waves / SST / swell where NDBC coverage is sparse.
 */
export interface OpenMeteoClient {
  getMarineForecast(query: OpenMeteoMarineQuery): Promise<OpenMeteoMarineForecast>;
}

export const OPEN_METEO_CLIENT = Symbol('OPEN_METEO_CLIENT');
