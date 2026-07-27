/**
 * Shared segmented towed-cable integration used by downrigger (Model A) and
 * weighted / flatline (Model D). Force model from docs/02-depth-engine.md.
 */
import { CD_CYL_NORMAL, CD_CYL_TANGENT, RHO_SEAWATER } from '../constants.js';

export type TowedCableIntegrationInput = {
  readonly lengthM: number;
  readonly stwMs: number;
  /** Concentrated submerged weight at the free end (ball or sinker), newtons. */
  readonly tipWeightN: number;
  /** Hydrodynamic drag of the tip body at STW, newtons. */
  readonly tipDragN: number;
  /** Additional terminal tackle drag (flasher etc.), newtons. */
  readonly terminalDragN: number;
  readonly diameterM: number;
  /** Submerged weight of the line/cable per metre, N/m. */
  readonly wCableNpm: number;
  readonly segments: number;
};

export type TowedCableIntegrationResult = {
  readonly depthM: number;
  readonly setbackM: number;
  readonly blowbackAngleRad: number;
  readonly totalCableNormalDragN: number;
};

type SegmentForces = {
  readonly sinT: number;
  readonly cosT: number;
  readonly dN: number;
  readonly dH: number;
  readonly dV: number;
};

function segmentForces(
  H: number,
  V: number,
  stw: number,
  diameter: number,
  ds: number,
  wCable: number,
): SegmentForces {
  const theta = Math.atan2(H, V);
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const vN = stw * cosT;
  const vT = stw * sinT;

  const dN =
    0.5 * RHO_SEAWATER * CD_CYL_NORMAL * diameter * ds * vN * vN;
  const dT =
    0.5 * RHO_SEAWATER * CD_CYL_TANGENT * Math.PI * diameter * ds * vT * vT;

  return {
    sinT,
    cosT,
    dN,
    dH: dN * cosT + dT * sinT,
    dV: wCable * ds - dN * sinT + dT * cosT,
  };
}

/**
 * Integrate from the weighted tip toward the rod, accumulating drag segment by
 * segment (Heun). Includes v·cos θ and −D_n·sin θ.
 */
export function integrateTowedCable(
  input: TowedCableIntegrationInput,
): TowedCableIntegrationResult {
  if (input.segments < 1 || !Number.isInteger(input.segments)) {
    throw new Error(`segments must be a positive integer, got ${input.segments}`);
  }
  if (input.lengthM < 0) {
    throw new Error('length must be >= 0');
  }
  if (input.stwMs < 0) {
    throw new Error('stw must be >= 0');
  }

  let H = input.tipDragN + input.terminalDragN;
  let V = input.tipWeightN;
  let x = 0;
  let z = 0;
  let totalCableNormalDragN = 0;

  const ds = input.lengthM / input.segments;

  for (let i = 0; i < input.segments; i += 1) {
    const start = segmentForces(
      H,
      V,
      input.stwMs,
      input.diameterM,
      ds,
      input.wCableNpm,
    );
    const end = segmentForces(
      H + start.dH,
      V + start.dV,
      input.stwMs,
      input.diameterM,
      ds,
      input.wCableNpm,
    );

    const dH = 0.5 * (start.dH + end.dH);
    const dV = 0.5 * (start.dV + end.dV);
    x += ds * 0.5 * (start.sinT + end.sinT);
    z += ds * 0.5 * (start.cosT + end.cosT);
    totalCableNormalDragN += 0.5 * (start.dN + end.dN);
    H += dH;
    V += dV;
  }

  return {
    depthM: z,
    setbackM: x,
    blowbackAngleRad: Math.atan2(H, V),
    totalCableNormalDragN,
  };
}
