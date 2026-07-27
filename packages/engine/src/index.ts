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
