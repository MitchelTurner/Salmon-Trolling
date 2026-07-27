/**
 * Physical constants for the depth engine.
 *
 * Contract (docs/02-depth-engine.md): every exported value carries a source and one of
 * MEASURED / MANUFACTURER / ESTIMATED. ESTIMATED entries state uncertainty and include
 * TODO(calibrate). Never invent a silent number — if unknown, tag ESTIMATED and surface
 * it in DepthResult.assumptions.
 */
import type { Brand } from '@troll/units';
import { newtons, type Newtons } from '@troll/units';

/** Density, kg/m³. Not yet in @troll/units — local brand for engine constants. */
export type KgPerM3 = Brand<number, 'KgPerM3'>;

/** Kinematic viscosity, m²/s. */
export type M2PerS = Brand<number, 'M2PerS'>;

/** Acceleration, m/s². */
export type MPerS2 = Brand<number, 'MPerS2'>;

export type ProvenanceTag = 'MEASURED' | 'MANUFACTURER' | 'ESTIMATED';

type MeasuredOrManufacturer = {
  readonly tag: 'MEASURED' | 'MANUFACTURER';
  readonly source: string;
};

type Estimated = {
  readonly tag: 'ESTIMATED';
  readonly source: string;
  /** Relative or absolute uncertainty, stated in the constant's units or as a percent. */
  readonly uncertainty: string;
  /** Must remain true until Phase 6 probe calibration replaces the estimate. */
  readonly todoCalibrate: true;
};

export type ConstantProvenance = MeasuredOrManufacturer | Estimated;

function kgPerM3(value: number): KgPerM3 {
  return value as KgPerM3;
}

function m2PerS(value: number): M2PerS {
  return value as M2PerS;
}

function mPerS2(value: number): MPerS2 {
  return value as MPerS2;
}

// ---------------------------------------------------------------------------
// Fluid and material properties
// ---------------------------------------------------------------------------

/**
 * Seawater density at 10 °C, 32 PSU.
 * Source: UNESCO EOS-80.
 * MEASURED
 */
export const RHO_SEAWATER = kgPerM3(1025);

/**
 * Kinematic viscosity of seawater near 10 °C, 32 PSU (SE Alaska range 7–13 °C).
 * Source: seawater property tables at 10 °C (not the 20 °C textbook value ~1.05e-6).
 * MEASURED
 */
export const NU_SEAWATER = m2PerS(1.35e-6);

/**
 * Density of lead.
 * Source: CRC Handbook of Chemistry and Physics.
 * MEASURED
 */
export const RHO_LEAD = kgPerM3(11340);

/**
 * Density of stainless steel wire/cable (AISI 316 class).
 * Source: AISI 316 material data sheets.
 * MEASURED
 */
export const RHO_STEEL = kgPerM3(8000);

/**
 * Standard acceleration of gravity.
 * Source: BIPM / CODATA conventional standard gravity.
 * MEASURED
 */
export const G = mPerS2(9.80665);

// ---------------------------------------------------------------------------
// Drag coefficients
// ---------------------------------------------------------------------------

/**
 * Drag coefficient, smooth sphere, Re 1e4–2e5.
 * Source: Schlichting, Boundary-Layer Theory.
 * MANUFACTURER
 */
export const CD_SPHERE = 0.47;

/**
 * Drag coefficient, pancake / disk-style downrigger weight, flow normal to face.
 * Source: flat-disk Cd literature, adapted for fishing weights.
 * ESTIMATED ±25%
 * TODO(calibrate): refit from probe data in Phase 6
 */
export const CD_PANCAKE = 1.1;

/**
 * Drag coefficient, torpedo-style downrigger weight, axial flow.
 * Source: streamlined-body Cd order-of-magnitude for fishing sinkers.
 * ESTIMATED ±30%
 * TODO(calibrate): refit from probe data in Phase 6
 */
export const CD_TORPEDO = 0.2;

/**
 * Normal drag coefficient, smooth cylinder, Re ~1e3.
 * Source: order-of-magnitude cylinder Cd; cable is not a perfect laboratory cylinder.
 * ESTIMATED ±20%
 * TODO(calibrate): refit from probe data in Phase 6
 */
export const CD_CYL_NORMAL = 1.1;

/**
 * Tangential (skin-friction) drag coefficient for a cable segment.
 * Used as CD in D_t = 0.5 ρ CD π d ds v_t².
 * Source: order-of-magnitude tangential cable drag; highly geometry-sensitive.
 * ESTIMATED ±50%
 * TODO(calibrate): refit from probe data in Phase 6
 */
export const CD_CYL_TANGENT = 0.02;

// ---------------------------------------------------------------------------
// Attractor drag table (terminal tackle), keyed by model and size
// ---------------------------------------------------------------------------

export type AttractorDragKey = {
  readonly model: string;
  readonly size: string;
};

export type AttractorDragEntry = AttractorDragKey & {
  readonly dragN: Newtons;
  readonly provenance: ConstantProvenance;
};

/**
 * Horizontal drag of common attractors at reference trolling speed (~2.5 kt).
 * Values feed the downrigger terminalDrag term. Prefer MANUFACTURER/MEASURED when known.
 */
export const ATTRACTOR_DRAG_TABLE: readonly AttractorDragEntry[] = [
  {
    model: 'Hot Spot Flasher',
    size: '11 in',
    dragN: newtons(10),
    provenance: {
      // Source: angler-rule-of-thumb / depth-engine sanity anchor (~10 N for 11" flasher + hoochie).
      // ESTIMATED ±30%
      // TODO(calibrate): refit from probe data in Phase 6
      tag: 'ESTIMATED',
      source:
        'depth-engine sanity anchor: 11" flasher + hoochie ≈ 10 N at 2.5 kt STW',
      uncertainty: '±30%',
      todoCalibrate: true,
    },
  },
  {
    model: 'Hot Spot Flasher',
    size: '8 in',
    dragN: newtons(6),
    provenance: {
      // ESTIMATED ±40%
      // TODO(calibrate): refit from probe data in Phase 6
      tag: 'ESTIMATED',
      source: 'scaled from 11 in Hot Spot estimate by frontal area',
      uncertainty: '±40%',
      todoCalibrate: true,
    },
  },
  {
    model: 'S.W. Dodger',
    size: '8 in',
    dragN: newtons(6),
    provenance: {
      // ESTIMATED ±40%
      // TODO(calibrate): refit from probe data in Phase 6
      tag: 'ESTIMATED',
      source: 'order-of-magnitude dodger drag at trolling speed',
      uncertainty: '±40%',
      todoCalibrate: true,
    },
  },
  {
    model: 'S.W. Dodger',
    size: '6 in',
    dragN: newtons(3.5),
    provenance: {
      // ESTIMATED ±40%
      // TODO(calibrate): refit from probe data in Phase 6
      tag: 'ESTIMATED',
      source: 'scaled from 8 in dodger estimate by frontal area',
      uncertainty: '±40%',
      todoCalibrate: true,
    },
  },
];

/** Look up attractor drag by model and size. Exact string match on both fields. */
export function attractorDragN(
  model: string,
  size: string,
): Newtons | undefined {
  const hit = ATTRACTOR_DRAG_TABLE.find(
    (entry) => entry.model === model && entry.size === size,
  );
  return hit?.dragN;
}

// ---------------------------------------------------------------------------
// Provenance registry — source of truth for the tag-enforcement test
// ---------------------------------------------------------------------------

/**
 * Every exported numeric constant (and each attractor-table row) must appear here.
 * ESTIMATED rows must include uncertainty and todoCalibrate: true.
 */
export const CONSTANT_PROVENANCE = {
  RHO_SEAWATER: {
    tag: 'MEASURED',
    source: 'UNESCO EOS-80 (10 °C, 32 PSU)',
  },
  NU_SEAWATER: {
    tag: 'MEASURED',
    source: 'seawater property tables at 10 °C, 32 PSU',
  },
  RHO_LEAD: {
    tag: 'MEASURED',
    source: 'CRC Handbook of Chemistry and Physics',
  },
  RHO_STEEL: {
    tag: 'MEASURED',
    source: 'AISI 316 material data sheets',
  },
  G: {
    tag: 'MEASURED',
    source: 'BIPM / CODATA conventional standard gravity',
  },
  CD_SPHERE: {
    tag: 'MANUFACTURER',
    source: 'Schlichting, Boundary-Layer Theory (smooth sphere, Re 1e4–2e5)',
  },
  CD_PANCAKE: {
    tag: 'ESTIMATED',
    source: 'flat-disk Cd literature, adapted for fishing weights',
    uncertainty: '±25%',
    todoCalibrate: true,
  },
  CD_TORPEDO: {
    tag: 'ESTIMATED',
    source: 'streamlined-body Cd order-of-magnitude for fishing sinkers',
    uncertainty: '±30%',
    todoCalibrate: true,
  },
  CD_CYL_NORMAL: {
    tag: 'ESTIMATED',
    source: 'smooth cylinder Cd, Re ~1e3; cable is not a laboratory cylinder',
    uncertainty: '±20%',
    todoCalibrate: true,
  },
  CD_CYL_TANGENT: {
    tag: 'ESTIMATED',
    source: 'order-of-magnitude tangential cable drag',
    uncertainty: '±50%',
    todoCalibrate: true,
  },
} as const satisfies Record<string, ConstantProvenance>;

/** Names of scalar constants that must carry provenance tags. */
export type ConstantName = keyof typeof CONSTANT_PROVENANCE;

export const CONSTANT_NAMES = Object.keys(
  CONSTANT_PROVENANCE,
) as ConstantName[];
