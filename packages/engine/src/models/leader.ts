/**
 * Leader / attractor geometry relative to the downrigger ball.
 * Spec: docs/02-depth-engine.md
 *
 * The lure sits below and behind the ball:
 *   lureDepth   = ballDepth + releaseDropHeight − leaderRise
 *   lureSetback = ballSetback + leaderSetback
 *
 * The leader is the same segmented towed-cable integration as the downrigger,
 * with the attractor's drag at the free end and no concentrated weight — so the
 * leader streams aft and does not dive the way a ball does.
 */
import {
  meters,
  type Meters,
  type MetersPerSecond,
  type Newtons,
  type Brand,
} from '@troll/units';
import {
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
  CONSTANT_PROVENANCE,
  G,
  RHO_SEAWATER,
} from '../constants.js';

/** Linear density, kg/m. */
export type KgPerM = Brand<number, 'KgPerM'>;

export function kgPerM(value: number): KgPerM {
  return value as KgPerM;
}

/**
 * Nylon monofilament density.
 * Source: typical PA6/PA66 fishing-line material data.
 * ESTIMATED ±5%
 * TODO(calibrate): move into constants.ts with measured line samples
 */
const RHO_MONOFILAMENT = 1140;

export type LeaderLine = {
  readonly diameter: Meters;
  /** Mass per metre of leader. When omitted, estimated from diameter × nylon density. */
  readonly linearMass?: KgPerM;
};

export type SolveLeaderInput = {
  readonly leaderLength: Meters;
  readonly stw: MetersPerSecond;
  readonly leader: LeaderLine;
  readonly attractorDrag: Newtons;
  readonly segments?: number;
};

export type SolveLeaderResult = {
  /** How much shallower the attractor/lure sits than the release clip. */
  readonly leaderRise: Meters;
  /** Horizontal distance of the attractor/lure aft of the release clip. */
  readonly leaderSetback: Meters;
  readonly assumptions: string[];
};

export type LurePositionInput = {
  readonly ballDepth: Meters;
  readonly ballSetback: Meters;
  readonly releaseDropHeight: Meters;
  readonly leader: SolveLeaderResult;
};

export type LurePosition = {
  readonly lureDepth: Meters;
  readonly lureSetback: Meters;
};

type SegmentForces = {
  readonly sinT: number;
  readonly cosT: number;
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
    dH: dN * cosT + dT * sinT,
    // Upward normal-drag component −D_n·sin θ — same term as the downrigger.
    dV: wCable * ds - dN * sinT + dT * cosT,
  };
}

function linearMassKgPerM(leader: LeaderLine): {
  value: number;
  assumptions: string[];
} {
  if (leader.linearMass !== undefined) {
    return { value: leader.linearMass, assumptions: [] };
  }
  const radius = leader.diameter / 2;
  const value = Math.PI * radius * radius * RHO_MONOFILAMENT;
  return {
    value,
    assumptions: [
      `leader linearMass from diameter×ρ_nylon (${RHO_MONOFILAMENT} kg/m³, ESTIMATED ±5%; TODO(calibrate))`,
    ],
  };
}

/**
 * Integrate from the attractor (free end, drag, no concentrated weight) toward
 * the release clip. Returns rise/setback of the lure relative to the release.
 */
export function solveLeader(input: SolveLeaderInput): SolveLeaderResult {
  const segments = input.segments ?? 100;
  if (segments < 1 || !Number.isInteger(segments)) {
    throw new Error(`segments must be a positive integer, got ${segments}`);
  }
  if (input.leaderLength < 0) {
    throw new Error('leaderLength must be >= 0');
  }
  if (input.stw < 0) {
    throw new Error('stw must be >= 0');
  }
  if (input.attractorDrag < 0) {
    throw new Error('attractorDrag must be >= 0');
  }

  const { value: linearMass, assumptions: massAssumptions } = linearMassKgPerM(
    input.leader,
  );

  // No concentrated weight at the free end — only attractor drag and light line.
  // Plain SI numbers during integration; inputs are already branded at the boundary.
  let H: number = input.attractorDrag;
  let V = 0;
  let x = 0;
  let z = 0;

  const ds = input.leaderLength / segments;
  const wCable =
    linearMass * (1 - RHO_SEAWATER / RHO_MONOFILAMENT) * G;

  for (let i = 0; i < segments; i += 1) {
    const start = segmentForces(
      H,
      V,
      input.stw,
      input.leader.diameter,
      ds,
      wCable,
    );
    const end = segmentForces(
      H + start.dH,
      V + start.dV,
      input.stw,
      input.leader.diameter,
      ds,
      wCable,
    );

    const dH = 0.5 * (start.dH + end.dH);
    const dV = 0.5 * (start.dV + end.dV);
    const sinAvg = 0.5 * (start.sinT + end.sinT);
    const cosAvg = 0.5 * (start.cosT + end.cosT);

    x += ds * sinAvg;
    z += ds * cosAvg;
    H += dH;
    V += dV;
  }

  // z is the vertical span from attractor to release with +z downward.
  // Positive z ⇒ attractor deeper than release (sag). Spec: the leader does not
  // sink — clamp sag out and report only true rise.
  const leaderRise = meters(Math.max(0, -z));
  const leaderSetback = meters(Math.min(input.leaderLength, Math.max(0, x)));

  const cyl = CONSTANT_PROVENANCE.CD_CYL_NORMAL;
  const assumptions = [
    ...massAssumptions,
    'leader has no concentrated weight at the attractor (streams; does not dive)',
    `CD_CYL_NORMAL=${CD_CYL_NORMAL} (${cyl.tag}${cyl.tag === 'ESTIMATED' ? ` ${cyl.uncertainty}` : ''})`,
    `CD_CYL_TANGENT=${CD_CYL_TANGENT} (${CONSTANT_PROVENANCE.CD_CYL_TANGENT.tag})`,
    `attractorDrag=${input.attractorDrag} N at STW=${input.stw} m/s`,
  ];

  if (z > 1e-4) {
    assumptions.push(
      `leader sag ${z.toFixed(3)} m clamped to rise=0 (no-weight model does not sink)`,
    );
  }

  return {
    leaderRise,
    leaderSetback,
    assumptions,
  };
}

/**
 * Absolute lure position from ball geometry and the leader solution.
 *   lureDepth   = ballDepth + releaseDropHeight − leaderRise
 *   lureSetback = ballSetback + leaderSetback
 */
export function lurePositionFromBall(input: LurePositionInput): LurePosition {
  return {
    lureDepth: meters(
      input.ballDepth + input.releaseDropHeight - input.leader.leaderRise,
    ),
    lureSetback: meters(input.ballSetback + input.leader.leaderSetback),
  };
}
