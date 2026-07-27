import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RuleContext } from '../rules/types.js';
import { recommendFromRules } from './build.js';
import {
  clampRecommendationScore,
  scoreFromRuleWeights,
} from './score.js';
import {
  RULES_SCORE_CAP,
  nonEmptyReasons,
  type NonEmptyArray,
  type Reason,
  type Recommendation,
} from './types.js';

const BASE: RuleContext = {
  lightLevel: 0.9,
  turbidity: 0.1,
  weekOfYear: 24,
};

const sampleReason: Reason = {
  factor: 'light',
  observation: 'light level 0.10',
  effect: 'favors glow',
  weight: 0.7,
};

describe('Recommendation types', () => {
  it('rejects empty reasons at the type level', () => {
    expectTypeOf<readonly []>().not.toMatchTypeOf<NonEmptyArray<Reason>>();
    expectTypeOf<readonly [Reason, ...Reason[]]>().toMatchTypeOf<
      Recommendation['reasons']
    >();
    expectTypeOf([sampleReason] as const).toMatchTypeOf<NonEmptyArray<Reason>>();
  });

  it('throws at runtime if reasons are empty', () => {
    expect(() => nonEmptyReasons([])).toThrow(/non-empty/);
    expect(nonEmptyReasons([sampleReason])[0]?.factor).toBe('light');
  });
});

describe('clampRecommendationScore', () => {
  it('caps rules-basis scores at 0.6', () => {
    expect(clampRecommendationScore(1, 'rules')).toBe(RULES_SCORE_CAP);
    expect(clampRecommendationScore(0.9, 'rules')).toBe(RULES_SCORE_CAP);
    expect(clampRecommendationScore(0.4, 'rules')).toBe(0.4);
  });

  it('allows personal/community scores above the rules cap', () => {
    expect(clampRecommendationScore(0.85, 'personal')).toBe(0.85);
    expect(clampRecommendationScore(1, 'community')).toBe(1);
  });

  it('clamps into [0, 1]', () => {
    expect(clampRecommendationScore(-1, 'personal')).toBe(0);
    expect(clampRecommendationScore(2, 'personal')).toBe(1);
  });
});

describe('scoreFromRuleWeights', () => {
  it('never exceeds the rules cap even with strong stacked weights', () => {
    const score = scoreFromRuleWeights([0.7, 0.65, 0.6], 'rules');
    expect(score).toBeLessThanOrEqual(RULES_SCORE_CAP);
    expect(score).toBe(RULES_SCORE_CAP);
  });
});

describe('recommendFromRules', () => {
  it('always returns non-empty reasons and basis rules', () => {
    const rec = recommendFromRules({ ctx: BASE });
    expect(rec.basis).toBe('rules');
    expect(rec.reasons.length).toBeGreaterThan(0);
    expect(rec.score).toBeLessThanOrEqual(RULES_SCORE_CAP);
    expect(rec.lure.finishes.length).toBeGreaterThan(0);
    expect(rec.depthBand.max).toBeGreaterThan(rec.depthBand.min);
    expect(rec.speedBand.max).toBeGreaterThan(rec.speedBand.min);
  });

  it('surfaces low-light glow reasons from the catalog', () => {
    const rec = recommendFromRules({
      ctx: { ...BASE, lightLevel: 0.1, turbidity: 0.2 },
    });
    expect(rec.reasons.some((r) => r.effect.includes('glow'))).toBe(true);
    expect(rec.lure.finishes).toContain('glow');
    expect(rec.score).toBeLessThanOrEqual(RULES_SCORE_CAP);
    for (const reason of rec.reasons) {
      expect(reason.observation.length).toBeGreaterThan(0);
      expect(reason.effect.length).toBeGreaterThan(0);
    }
  });

  it('emits a baseline reason when nothing matches', () => {
    const rec = recommendFromRules({
      ctx: {
        lightLevel: 0.5,
        turbidity: 0.2,
        weekOfYear: 40,
        // mid values that avoid catalog predicates
      },
      ruleSet: { version: 1, rules: [] },
    });
    expect(rec.reasons).toHaveLength(1);
    expect(rec.reasons[0]?.effect).toContain('baseline');
    expect(rec.score).toBeLessThanOrEqual(RULES_SCORE_CAP);
  });

  it('biases depth deeper for winter feeder kings', () => {
    const baseline = recommendFromRules({
      ctx: { ...BASE, weekOfYear: 24, species: 'king' },
    });
    const feeder = recommendFromRules({
      ctx: {
        ...BASE,
        weekOfYear: 2,
        species: 'feeder_king',
        lightLevel: 0.5,
      },
    });
    expect(feeder.depthBand.min).toBeGreaterThan(baseline.depthBand.min);
    expect(feeder.speedBand.min).toBeLessThan(baseline.speedBand.min);
  });
});
