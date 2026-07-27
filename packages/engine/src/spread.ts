/**
 * Turn dynamics and multi-rig spread.
 * Spec: docs/02-depth-engine.md
 *
 *   localSpeed = stw + omega * lateralOffsetFromTurnCenter
 *
 * Sign convention:
 * - omega > 0 ⇒ boat turning to starboard (heading increasing)
 * - lateralOffset > 0 ⇒ gear to starboard of centerline
 * - lateralOffsetFromTurnCenter = −lateralOffset, so the inside (starboard)
 *   rod slows and sinks on a starboard turn; the outside rod speeds up and rises.
 */
import {
  meters,
  metersPerSecond,
  type Meters,
  type MetersPerSecond,
  type Radians,
} from '@troll/units';

/** Default horizontal separation below which a tangle warning fires. */
export const DEFAULT_TANGLE_THRESHOLD_M = meters(2);

export type SpreadRigInput = {
  readonly id: string;
  /** Metres to starboard of the boat centerline (port is negative). */
  readonly lateralOffset: Meters;
  /** Horizontal setback of the gear at the boat STW, metres aft. */
  readonly setback: Meters;
  /** Depth of the gear at the boat STW, metres. */
  readonly depth: Meters;
  /** Recompute depth at a local STW (caller supplies the delivery model). */
  readonly depthAtStw: (stw: MetersPerSecond) => Meters;
  /** Optional: setback at local STW for tangle geometry (defaults to nominal). */
  readonly setbackAtStw?: (stw: MetersPerSecond) => Meters;
};

export type AnalyzeSpreadInput = {
  readonly stw: MetersPerSecond;
  /** Yaw rate in rad/s; positive = turning to starboard. */
  readonly omega: Radians | number;
  readonly rigs: readonly SpreadRigInput[];
  /** Horizontal separation threshold for tangle warnings. */
  readonly tangleThreshold?: Meters;
};

export type RigTurnResult = {
  readonly id: string;
  readonly localSpeed: MetersPerSecond;
  readonly depth: Meters;
  /**
   * localDepth − nominalDepth. Positive ⇒ sank in the turn; negative ⇒ rose.
   */
  readonly depthSwing: Meters;
  readonly setback: Meters;
  readonly lateralOffset: Meters;
};

export type TangleWarning = {
  readonly rigIdA: string;
  readonly rigIdB: string;
  readonly separation: Meters;
  readonly threshold: Meters;
};

export type AnalyzeSpreadResult = {
  readonly rigs: readonly RigTurnResult[];
  readonly tangleWarnings: readonly TangleWarning[];
};

/**
 * Lateral lever arm from the turn center for the local-speed formula.
 * With omega > 0 (starboard turn), starboard gear (y > 0) gets a negative offset
 * so localSpeed = stw + omega * offset falls on the inside.
 */
export function lateralOffsetFromTurnCenter(lateralOffset: Meters): number {
  return -lateralOffset;
}

/**
 * Local STW at a rig during a yaw: stw + omega * lateralOffsetFromTurnCenter.
 * Clamped to ≥ 0 — gear does not reverse through the water in this model.
 */
export function localSpeedInTurn(
  stw: MetersPerSecond,
  omega: number,
  lateralOffset: Meters,
): MetersPerSecond {
  const raw = stw + omega * lateralOffsetFromTurnCenter(lateralOffset);
  return metersPerSecond(Math.max(0, raw));
}

function horizontalSeparation(
  a: { setback: number; lateralOffset: number },
  b: { setback: number; lateralOffset: number },
): number {
  const dx = a.setback - b.setback;
  const dy = a.lateralOffset - b.lateralOffset;
  return Math.hypot(dx, dy);
}

/**
 * Per-rig local speed and depth swing under a turn, plus pairwise tangle warnings
 * when predicted horizontal positions converge within the threshold.
 */
export function analyzeSpread(input: AnalyzeSpreadInput): AnalyzeSpreadResult {
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }
  if (input.rigs.length === 0) {
    return { rigs: [], tangleWarnings: [] };
  }

  const omega = Number(input.omega);
  const threshold = input.tangleThreshold ?? DEFAULT_TANGLE_THRESHOLD_M;

  const rigs: RigTurnResult[] = input.rigs.map((rig) => {
    const localSpeed = localSpeedInTurn(input.stw, omega, rig.lateralOffset);
    const localDepth = rig.depthAtStw(localSpeed);
    const localSetback = rig.setbackAtStw
      ? rig.setbackAtStw(localSpeed)
      : rig.setback;

    return {
      id: rig.id,
      localSpeed,
      depth: meters(localDepth),
      depthSwing: meters(localDepth - rig.depth),
      setback: meters(localSetback),
      lateralOffset: rig.lateralOffset,
    };
  });

  const tangleWarnings: TangleWarning[] = [];
  for (let i = 0; i < rigs.length; i += 1) {
    for (let j = i + 1; j < rigs.length; j += 1) {
      const a = rigs[i];
      const b = rigs[j];
      if (a === undefined || b === undefined) continue;

      const separation = horizontalSeparation(
        { setback: a.setback, lateralOffset: a.lateralOffset },
        { setback: b.setback, lateralOffset: b.lateralOffset },
      );

      if (separation <= threshold) {
        tangleWarnings.push({
          rigIdA: a.id,
          rigIdB: b.id,
          separation: meters(separation),
          threshold: meters(threshold),
        });
      }
    }
  }

  return { rigs, tangleWarnings };
}
