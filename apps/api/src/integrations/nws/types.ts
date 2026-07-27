export type MarineForecastPeriod = {
  readonly name: string;
  readonly text: string;
};

export type MarineZoneForecast = {
  readonly zoneId: string;
  readonly zoneName: string;
  /** WFO / issuing office (e.g. PAJK). UI must display this. */
  readonly issuingOffice: string;
  /** ISO issuance time. UI must display this. */
  readonly issueTime: string;
  readonly fetchedAt: string;
  readonly productId: string;
  readonly periods: readonly MarineForecastPeriod[];
  /** Raw zone section for offline bundle / display. */
  readonly rawText: string;
  readonly cacheTtlMs: number;
};

export type MarineForecastQuery = {
  /** NWS coastal zone id, e.g. PKZ036. */
  readonly zoneId: string;
  /** CWF product location / CWA, e.g. AJK. */
  readonly cwfLocation: string;
};

/**
 * NOAA NWS integration boundary.
 * Marine forecasts are zone-based, never point-grid.
 */
export interface NwsClient {
  getMarineZoneForecast(query: MarineForecastQuery): Promise<MarineZoneForecast>;
}

export const NWS_CLIENT = Symbol('NWS_CLIENT');
