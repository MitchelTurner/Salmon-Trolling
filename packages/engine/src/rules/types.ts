/**
 * Declarative recommendation rules — data, not code branches.
 *
 * Phase 4a ships folk knowledge as a versioned rule set. Phase 4b replaces
 * weights with fitted ones via data migration; predicates and effects stay
 * serializable so that swap is not a rewrite.
 */

/** Factors surfaced in Reason.factor (03-recommendations.md). */
export type RuleFactor =
  | 'light'
  | 'tide'
  | 'turbidity'
  | 'seaTemp'
  | 'runTiming'
  | 'moon';

export type TideStage = 'flood' | 'ebb' | 'slack_flood' | 'slack_ebb';

export type TargetSpecies =
  | 'king'
  | 'coho'
  | 'pink'
  | 'chum'
  | 'sockeye'
  | 'feeder_king';

export type FinishHint = 'glow' | 'uv' | 'bright' | 'natural' | 'chrome';

/**
 * Inputs available to rule predicates. Optional fields fail closed when missing
 * (predicate does not match) unless the rule only references present fields.
 */
export type RuleContext = {
  /** 0 = night below civil twilight, 1 = full daylight. */
  readonly lightLevel: number;
  /** 0 = clear, 1 = heavy glacial silt / runoff. */
  readonly turbidity: number;
  /** ISO week of year 1–53. */
  readonly weekOfYear: number;
  readonly seaTempC?: number;
  readonly tideStage?: TideStage;
  /** Absolute current speed, m/s. */
  readonly currentSpeedMs?: number;
  readonly species?: TargetSpecies;
  /** 0–1 fraction of sky covered. */
  readonly cloudCover?: number;
  /** 0–1 moon illuminated fraction. */
  readonly moonIllumination?: number;
};

export type NumericField = {
  [K in keyof RuleContext]-?: RuleContext[K] extends number | undefined
    ? K
    : never;
}[keyof RuleContext];

export type StringField = {
  [K in keyof RuleContext]-?: RuleContext[K] extends string | undefined
    ? K
    : never;
}[keyof RuleContext];

/** Leaf comparison on a context field — JSON-serializable. */
export type ComparePredicate =
  | {
      readonly field: NumericField;
      readonly op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';
      readonly value: number;
    }
  | {
      readonly field: NumericField;
      readonly op: 'between';
      /** Inclusive [min, max]. */
      readonly value: readonly [number, number];
    }
  | {
      readonly field: StringField;
      readonly op: 'eq' | 'neq';
      readonly value: string;
    }
  | {
      readonly field: StringField;
      readonly op: 'in';
      readonly value: readonly string[];
    };

export type Predicate =
  | ComparePredicate
  | { readonly all: readonly Predicate[] }
  | { readonly any: readonly Predicate[] }
  | { readonly not: Predicate };

/** Declarative effect applied when a rule matches. */
export type RuleEffect = {
  readonly finishes?: readonly FinishHint[];
  /** Relative influence 0–1. Fitted weights replace this in Phase 4b. */
  readonly weight: number;
  /** Depth suggestion bias in meters (positive = deeper). */
  readonly depthBiasM?: number;
  /** Speed suggestion bias in m/s (positive = faster). */
  readonly speedBiasMs?: number;
  readonly factor: RuleFactor;
  /** Human-readable effect for Reason.effect. */
  readonly effect: string;
};

/**
 * Provenance for a folk-knowledge rule. Not the same tags as physics constants —
 * these start unvalidated by design.
 */
export type RuleProvenance = {
  readonly source: string;
  readonly status: 'unvalidated' | 'local_practice' | 'literature';
};

export type Rule = {
  readonly id: string;
  /** Per-rule version; bump when when/then semantics change. */
  readonly version: number;
  readonly when: Predicate;
  readonly then: RuleEffect;
  readonly provenance: RuleProvenance;
};

export type RuleMatch = {
  readonly ruleId: string;
  readonly ruleVersion: number;
  readonly then: RuleEffect;
  readonly provenance: RuleProvenance;
};

export type RuleSet = {
  /** Whole-catalog version; bump on any catalog change. */
  readonly version: number;
  readonly rules: readonly Rule[];
};
