export type PositionSample = {
  readonly tMs: number;
  readonly lon: number;
  readonly lat: number;
  readonly sogMs?: number;
  readonly cogRad?: number;
  readonly headingRad?: number;
  readonly stwMs?: number;
  readonly soundingM?: number;
  readonly seaTempC?: number;
};

export type TripRecorderStatus =
  | 'idle'
  | 'recording'
  | 'closing'
  | 'error';

export type GeoWatchHandle = { clear: () => void };

export type GeoPositionSource = {
  watch(
    onSample: (sample: PositionSample) => void,
    onError: (err: Error) => void,
  ): GeoWatchHandle;
};

export type Clock = {
  now(): number;
  setInterval(fn: () => void, ms: number): { clear: () => void };
};

export type VisibilityApi = {
  addListener(fn: () => void): () => void;
  isHidden(): boolean;
};
