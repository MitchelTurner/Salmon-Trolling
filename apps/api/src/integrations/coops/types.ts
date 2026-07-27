import type { COOPS_TTL } from './ttl.js';

export type CoopsTtlKind = keyof typeof COOPS_TTL;

export type TidePredictionPoint = {
  readonly t: string;
  readonly heightM: number;
};

export type TidePredictions = {
  readonly stationId: string;
  readonly fetchedAt: string;
  readonly beginDate: string;
  readonly endDate: string;
  readonly predictions: readonly TidePredictionPoint[];
  readonly cacheTtlMs: number;
};

export type WaterLevelObservation = {
  readonly stationId: string;
  readonly stationName?: string;
  readonly fetchedAt: string;
  readonly t: string;
  readonly heightM: number;
  readonly sigmaM?: number;
  readonly quality?: string;
  readonly cacheTtlMs: number;
};

export type WaterTemperatureObservation = {
  readonly stationId: string;
  readonly stationName?: string;
  readonly fetchedAt: string;
  readonly t: string;
  readonly tempC: number;
  readonly cacheTtlMs: number;
};

export type CurrentPredictionPoint = {
  readonly t: string;
  readonly type: string;
  /** Major-axis velocity in cm/s (CO-OPS metric currents). */
  readonly velocityMajorCms: number;
  readonly meanFloodDirDeg?: number;
  readonly meanEbbDirDeg?: number;
};

export type CurrentPredictions = {
  readonly stationId: string;
  readonly fetchedAt: string;
  readonly beginDate: string;
  readonly endDate: string;
  readonly units: string;
  readonly predictions: readonly CurrentPredictionPoint[];
  readonly cacheTtlMs: number;
};

export type TidePredictionQuery = {
  readonly stationId: string;
  /** YYYYMMDD */
  readonly beginDate: string;
  /** YYYYMMDD */
  readonly endDate: string;
};

export type CurrentPredictionQuery = {
  readonly stationId: string;
  readonly beginDate: string;
  readonly endDate: string;
};

/**
 * NOAA CO-OPS integration boundary.
 * Services must depend on this interface — never call the API directly.
 */
export interface CoopsClient {
  getTidePredictions(query: TidePredictionQuery): Promise<TidePredictions>;
  getLatestWaterLevel(stationId: string): Promise<WaterLevelObservation>;
  getLatestWaterTemperature(
    stationId: string,
  ): Promise<WaterTemperatureObservation>;
  getCurrentPredictions(
    query: CurrentPredictionQuery,
  ): Promise<CurrentPredictions>;
}

export const COOPS_CLIENT = Symbol('COOPS_CLIENT');
