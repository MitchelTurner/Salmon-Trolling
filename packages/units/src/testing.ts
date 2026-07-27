/** Minimal property-based sampler — keeps `@troll/units` free of test-framework deps. */

export function forAllNumbers(
  run: (value: number) => void,
  options: { samples?: number; min?: number; max?: number } = {},
): void {
  const samples = options.samples ?? 1000;
  const min = options.min ?? -1e6;
  const max = options.max ?? 1e6;
  const span = max - min;

  run(0);
  run(min);
  run(max);
  run(1);
  run(-1);

  for (let i = 0; i < samples; i += 1) {
    run(min + Math.random() * span);
  }
}

export function expectClose(actual: number, expected: number, relTol = 1e-10): void {
  const scale = Math.max(1, Math.abs(expected));
  const delta = Math.abs(actual - expected);
  if (delta > relTol * scale) {
    throw new Error(
      `expected ${actual} to be close to ${expected} (Δ=${delta}, tol=${relTol * scale})`,
    );
  }
}
