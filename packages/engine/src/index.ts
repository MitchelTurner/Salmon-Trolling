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

export {
  DEFAULT_RULE_SET,
  RULES,
  RULESET_VERSION,
  assertSerializableRuleSet,
  evaluateRuleSet,
  evaluateRules,
  matchPredicate,
  type ComparePredicate,
  type FinishHint,
  type NumericField,
  type Predicate,
  type Rule,
  type RuleContext,
  type RuleEffect,
  type RuleFactor,
  type RuleMatch,
  type RuleProvenance,
  type RuleSet,
  type StringField,
  type TargetSpecies,
  type TideStage,
} from './rules/index.js';

export {
  BASELINE_DEPTH_MAX_M,
  BASELINE_DEPTH_MIN_M,
  BASELINE_LEADER_M,
  BASELINE_SPEED_MAX_MS,
  BASELINE_SPEED_MIN_MS,
  RULES_SCORE_CAP,
  clampRecommendationScore,
  nonEmptyReasons,
  observationForFactor,
  recommendFromRules,
  scoreFromRuleWeights,
  type Band,
  type GearSuggestion,
  type NonEmptyArray,
  type Reason,
  type RecommendFromRulesInput,
  type Recommendation,
  type RecommendationBasis,
} from './recommend/index.js';

export {
  assertEffortIncludesZeros,
  buildEffortSample,
  catchPerHour,
  tripDurationHours,
  type CatchPerHourResult,
  type EffortSample,
} from './effort/index.js';

export {
  FEATURE_NAMES,
  MIN_TRIPS_FOR_USER_FIT,
  MIN_USERS_FOR_POOLED_FIT,
  canFitPooled,
  canFitUser,
  featuresFromContext,
  fitPerUser,
  fitPooledWithUserOffset,
  predictGbt,
  predictPersonal,
  trainGbt,
  type FeatureName,
  type FeatureVector,
  type FitGateFailure,
  type FitRow,
  type GradientBoostedModel,
  type PooledFitSuccess,
  type Stump,
  type TrainGbtOptions,
  type UserFitSuccess,
} from './fit/index.js';

export {
  fitBallCd,
  fittedCdAssumption,
  selectNarrowestFit,
  type CalibrationFitResult,
  type CalibrationSample,
  type FitBallCdOptions,
  type FitScope,
  type StoredCalibrationFit,
} from './calibration/index.js';
