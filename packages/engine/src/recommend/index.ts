export {
  BASELINE_DEPTH_MAX_M,
  BASELINE_DEPTH_MIN_M,
  BASELINE_LEADER_M,
  BASELINE_SPEED_MAX_MS,
  BASELINE_SPEED_MIN_MS,
  observationForFactor,
  recommendFromRules,
  type RecommendFromRulesInput,
} from './build.js';

export {
  clampRecommendationScore,
  scoreFromRuleWeights,
} from './score.js';

export {
  RULES_SCORE_CAP,
  nonEmptyReasons,
  type Band,
  type GearSuggestion,
  type NonEmptyArray,
  type Reason,
  type Recommendation,
  type RecommendationBasis,
} from './types.js';
