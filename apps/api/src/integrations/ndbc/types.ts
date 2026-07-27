export type NdbcObservation = {
  readonly t: string;
  readonly windDirDeg?: number;
  readonly windSpeedMs?: number;
  readonly gustMs?: number;
  readonly waveHeightM?: number;
  readonly dominantPeriodS?: number;
  readonly averagePeriodS?: number;
  readonly meanWaveDirDeg?: number;
  readonly pressureHpa?: number;
  readonly airTempC?: number;
  readonly waterTempC?: number;
  readonly dewpointC?: number;
};

/** A missing span in the observation series — never silently interpolated. */
export type NdbcGap = {
  readonly after: string;
  readonly before: string;
  readonly gapMs: number;
};

export type NdbcStationObservations = {
  readonly stationId: string;
  readonly fetchedAt: string;
  readonly observations: readonly NdbcObservation[];
  /** Detected gaps; empty only when the series is contiguous. */
  readonly gaps: readonly NdbcGap[];
  readonly cacheTtlMs: number;
};

/**
 * NDBC integration boundary.
 * Sparse SE Alaska coverage — callers must handle gaps.
 */
export interface NdbcClient {
  getLatestObservations(
    stationId: string,
    options?: { limit?: number },
  ): Promise<NdbcStationObservations>;
}

export const NDBC_CLIENT = Symbol('NDBC_CLIENT');
