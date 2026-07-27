/** Pure depth-engine package. Physics models land in phase 1. */

export {
  ATTRACTOR_DRAG_TABLE,
  CD_CYL_NORMAL,
  CD_CYL_TANGENT,
  CD_PANCAKE,
  CD_SPHERE,
  CD_TORPEDO,
  CONSTANT_NAMES,
  CONSTANT_PROVENANCE,
  G,
  NU_SEAWATER,
  RHO_LEAD,
  RHO_SEAWATER,
  RHO_STEEL,
  attractorDragN,
  type AttractorDragEntry,
  type AttractorDragKey,
  type ConstantName,
  type ConstantProvenance,
  type KgPerM3,
  type M2PerS,
  type MPerS2,
  type ProvenanceTag,
} from './constants.js';

export {
  DEEP_SIX_MEDIUM_SETTING_2,
  DIVER_CHARTS,
  evaluateDiverFit,
  findDiverChart,
  fitDiverPowerLaw,
  isDiverOutOfRange,
  type DiverChart,
  type DiverChartPoint,
  type DiverFitParams,
} from './data/divers.js';

export {
  downriggerInputs,
  frontalArea,
  kgPerM,
  solveDownrigger,
  squareMeters,
  type BallShape,
  type DownriggerBall,
  type DownriggerCable,
  type KgPerM,
  type SolveDownriggerInput,
  type SolveDownriggerResult,
  type SquareMeters,
} from './models/downrigger.js';

export {
  kgPerM as leaderKgPerM,
  lurePositionFromBall,
  solveLeader,
  type LeaderLine,
  type LurePosition,
  type LurePositionInput,
  type SolveLeaderInput,
  type SolveLeaderResult,
} from './models/leader.js';

export { solveDiver, type SolveDiverInput, type SolveDiverResult } from './models/diver.js';

export {
  LEADCORE_DEFAULT_PARAMS,
  solveLeadcore,
  solveWire,
  type LeadcoreParams,
  type SolveLeadcoreInput,
  type SolveLeadcoreResult,
  type SolveWireInput,
} from './models/leadcore.js';

export {
  solveFlatline,
  solveWeighted,
  type SolveFlatlineInput,
  type SolveWeightedInput,
  type SolveWeightedResult,
  type WeightedLine,
  type WeightedTip,
} from './models/weighted.js';

export {
  integrateTowedCable,
  type TowedCableIntegrationInput,
  type TowedCableIntegrationResult,
} from './models/towed-cable.js';

export { V_REF } from './models/v-ref.js';

export {
  BARE_SOG_WARNING,
  resolveStw,
  type PredictedCurrent,
  type ResolveStwInput,
  type ResolveStwResult,
  type StwConfidence,
  type StwSource,
  type Velocity2,
} from './stw.js';

export {
  STW_SIGMA_KT,
  WIDE_SIGMA_FRACTION,
  composeSigma,
  parseRelativeUncertainty,
  stwSigmaMs,
  type ComposeSigmaInput,
  type ComposeSigmaResult,
  type EstimatedConstantPerturbation,
  type UncertaintyComponent,
} from './uncertainty.js';

export {
  DEFAULT_TANGLE_THRESHOLD_M,
  analyzeSpread,
  lateralOffsetFromTurnCenter,
  localSpeedInTurn,
  type AnalyzeSpreadInput,
  type AnalyzeSpreadResult,
  type RigTurnResult,
  type SpreadRigInput,
  type TangleWarning,
} from './spread.js';

export {
  CIVIL_TWILIGHT_ALT_DEG,
  SUNRISE_ALT_DEG,
  solarPosition,
  solarDay,
  lightLevelFromAltitude,
  moonPhase,
  lightContext,
  type SolarPosition,
  type SolarDay,
  type MoonPhase,
  type MoonPhaseName,
  type LightContext,
} from './astro/index.js';
