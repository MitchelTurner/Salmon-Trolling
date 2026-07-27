import { describe, expect, it } from 'vitest';
import { DEFAULT_RULE_SET, RULES, RULESET_VERSION } from './catalog.js';
import {
  assertSerializableRuleSet,
  evaluateRuleSet,
  matchPredicate,
} from './evaluate.js';
import type { Rule, RuleContext } from './types.js';

const BASE: RuleContext = {
  lightLevel: 0.9,
  turbidity: 0.1,
  weekOfYear: 24,
};

describe('rules catalog provenance and versioning', () => {
  it('exposes a versioned ruleset', () => {
    expect(RULESET_VERSION).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_RULE_SET.version).toBe(RULESET_VERSION);
    expect(DEFAULT_RULE_SET.rules.length).toBeGreaterThan(0);
  });

  it('gives every rule an id, version, and non-empty provenance', () => {
    const ids = new Set<string>();
    for (const rule of RULES) {
      expect(rule.id.length).toBeGreaterThan(0);
      expect(ids.has(rule.id), `duplicate rule id ${rule.id}`).toBe(false);
      ids.add(rule.id);

      expect(rule.version).toBeGreaterThanOrEqual(1);
      expect(rule.provenance.source.length).toBeGreaterThan(0);
      expect(['unvalidated', 'local_practice', 'literature']).toContain(
        rule.provenance.status,
      );
      expect(rule.then.weight).toBeGreaterThan(0);
      expect(rule.then.weight).toBeLessThanOrEqual(1);
      expect(rule.then.factor.length).toBeGreaterThan(0);
      expect(rule.then.effect.length).toBeGreaterThan(0);
    }
  });

  it('is JSON data — round-trips without functions', () => {
    const cloned = assertSerializableRuleSet(DEFAULT_RULE_SET);
    expect(cloned).toEqual(DEFAULT_RULE_SET);
    expect(typeof cloned.rules[0]?.when).toBe('object');
  });
});

describe('matchPredicate', () => {
  it('matches numeric comparisons and compounds', () => {
    expect(
      matchPredicate(BASE, { field: 'lightLevel', op: 'lt', value: 0.25 }),
    ).toBe(false);
    expect(
      matchPredicate(
        { ...BASE, lightLevel: 0.1 },
        { field: 'lightLevel', op: 'lt', value: 0.25 },
      ),
    ).toBe(true);
    expect(
      matchPredicate(BASE, {
        any: [
          { field: 'lightLevel', op: 'lt', value: 0.25 },
          { field: 'turbidity', op: 'gt', value: 0.6 },
        ],
      }),
    ).toBe(false);
    expect(
      matchPredicate(
        { ...BASE, turbidity: 0.8 },
        {
          any: [
            { field: 'lightLevel', op: 'lt', value: 0.25 },
            { field: 'turbidity', op: 'gt', value: 0.6 },
          ],
        },
      ),
    ).toBe(true);
  });

  it('fails closed when an optional field is missing', () => {
    expect(
      matchPredicate(BASE, { field: 'seaTempC', op: 'lt', value: 8 }),
    ).toBe(false);
    expect(
      matchPredicate(
        { ...BASE, seaTempC: 6 },
        { field: 'seaTempC', op: 'lt', value: 8 },
      ),
    ).toBe(true);
  });
});

describe('evaluateRuleSet', () => {
  it('fires low-light-glow from the catalog example', () => {
    const matches = evaluateRuleSet(
      { ...BASE, lightLevel: 0.1, turbidity: 0.2 },
      DEFAULT_RULE_SET,
    );
    const glow = matches.find((m) => m.ruleId === 'low-light-glow');
    expect(glow).toBeDefined();
    expect(glow?.then.finishes).toEqual(['glow', 'uv']);
    expect(glow?.then.weight).toBe(0.7);
    expect(glow?.provenance.source).toContain('unvalidated');
  });

  it('fires turbidity path of low-light-glow', () => {
    const matches = evaluateRuleSet(
      { ...BASE, lightLevel: 0.9, turbidity: 0.75 },
      DEFAULT_RULE_SET,
    );
    expect(matches.some((m) => m.ruleId === 'low-light-glow')).toBe(true);
    expect(matches.some((m) => m.ruleId === 'high-turbidity-uv')).toBe(true);
  });

  it('applies king peak run-timing in late May–June', () => {
    const matches = evaluateRuleSet(
      { ...BASE, weekOfYear: 24, species: 'king' },
      DEFAULT_RULE_SET,
    );
    expect(matches.some((m) => m.ruleId === 'king-peak-weeks')).toBe(true);
  });

  it('suggests deeper/slower for winter feeder kings', () => {
    const matches = evaluateRuleSet(
      {
        ...BASE,
        weekOfYear: 2,
        species: 'feeder_king',
        lightLevel: 0.5,
      },
      DEFAULT_RULE_SET,
    );
    const feeder = matches.find((m) => m.ruleId === 'feeder-king-winter');
    expect(feeder?.then.depthBiasM).toBe(8);
    expect(feeder?.then.speedBiasMs).toBe(-0.2);
  });

  it('preserves rule version on matches', () => {
    const rule: Rule = {
      id: 'test-rule',
      version: 3,
      when: { field: 'lightLevel', op: 'gte', value: 0 },
      then: {
        weight: 0.1,
        factor: 'light',
        effect: 'always',
      },
      provenance: { source: 'test', status: 'unvalidated' },
    };
    const [match] = evaluateRuleSet(BASE, { version: 1, rules: [rule] });
    expect(match?.ruleVersion).toBe(3);
  });
});
