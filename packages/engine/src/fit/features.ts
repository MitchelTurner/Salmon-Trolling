/**
 * Tabular features for Phase 4b fitting.
 * Keep this list stable — weight migrations in rules land against these columns.
 */

import type { RuleContext, TideStage } from '../rules/types.js';

export const FEATURE_NAMES = [
  'lightLevel',
  'turbidity',
  'weekOfYear',
  'seaTempC',
  'cloudCover',
  'moonIllumination',
  'currentSpeedMs',
  'tideFlood',
  'tideEbb',
  'tideSlack',
  'speciesKing',
  'speciesCoho',
  'speciesPink',
  'speciesFeeder',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export type FeatureVector = {
  readonly names: typeof FEATURE_NAMES;
  readonly values: readonly number[];
};

function tideFlags(stage: TideStage | undefined): {
  flood: number;
  ebb: number;
  slack: number;
} {
  switch (stage) {
    case 'flood':
      return { flood: 1, ebb: 0, slack: 0 };
    case 'ebb':
      return { flood: 0, ebb: 1, slack: 0 };
    case 'slack_flood':
    case 'slack_ebb':
      return { flood: 0, ebb: 0, slack: 1 };
    default:
      return { flood: 0, ebb: 0, slack: 0 };
  }
}

/** Encode a rules context into a dense numeric row (missing → 0). */
export function featuresFromContext(ctx: RuleContext): FeatureVector {
  const tide = tideFlags(ctx.tideStage);
  const values = [
    ctx.lightLevel,
    ctx.turbidity,
    ctx.weekOfYear / 53,
    ctx.seaTempC ?? 0,
    ctx.cloudCover ?? 0,
    ctx.moonIllumination ?? 0,
    ctx.currentSpeedMs ?? 0,
    tide.flood,
    tide.ebb,
    tide.slack,
    ctx.species === 'king' ? 1 : 0,
    ctx.species === 'coho' ? 1 : 0,
    ctx.species === 'pink' ? 1 : 0,
    ctx.species === 'feeder_king' ? 1 : 0,
  ];
  return { names: FEATURE_NAMES, values };
}
