/**
 * Effort is the denominator for catch-per-hour.
 * Trips with zero catches are the most information-dense records — never drop them.
 */

export type EffortSample = {
  readonly tripId: string;
  /** Hours from trip start to close; must be > 0 for inclusion in rates. */
  readonly durationHours: number;
  /** Active catch count — zero is valid and required. */
  readonly catchCount: number;
};

export type CatchPerHourResult = {
  readonly catchCount: number;
  readonly effortHours: number;
  /** catchCount / effortHours; null only when effortHours === 0. */
  readonly catchPerHour: number | null;
  /** How many contributing trips had zero catches. */
  readonly zeroCatchTrips: number;
  readonly tripCount: number;
};
