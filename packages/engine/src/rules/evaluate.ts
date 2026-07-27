import type {
  ComparePredicate,
  Predicate,
  Rule,
  RuleContext,
  RuleMatch,
  RuleSet,
} from './types.js';

function readField(
  ctx: RuleContext,
  field: ComparePredicate['field'],
): unknown {
  return ctx[field];
}

function matchCompare(ctx: RuleContext, pred: ComparePredicate): boolean {
  const raw = readField(ctx, pred.field);
  if (raw === undefined) return false;

  switch (pred.op) {
    case 'lt':
      return typeof raw === 'number' && raw < pred.value;
    case 'lte':
      return typeof raw === 'number' && raw <= pred.value;
    case 'gt':
      return typeof raw === 'number' && raw > pred.value;
    case 'gte':
      return typeof raw === 'number' && raw >= pred.value;
    case 'eq':
      return raw === pred.value;
    case 'neq':
      return raw !== pred.value;
    case 'between': {
      if (typeof raw !== 'number') return false;
      const [min, max] = pred.value;
      return raw >= min && raw <= max;
    }
    case 'in':
      return typeof raw === 'string' && pred.value.includes(raw);
  }
}

/** Evaluate a serializable predicate against a context. */
export function matchPredicate(ctx: RuleContext, pred: Predicate): boolean {
  if ('all' in pred) {
    return pred.all.every((p) => matchPredicate(ctx, p));
  }
  if ('any' in pred) {
    return pred.any.some((p) => matchPredicate(ctx, p));
  }
  if ('not' in pred) {
    return !matchPredicate(ctx, pred.not);
  }
  return matchCompare(ctx, pred);
}

/** Return every matching rule's effect — order is catalog order. */
export function evaluateRules(
  ctx: RuleContext,
  rules: readonly Rule[],
): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of rules) {
    if (!matchPredicate(ctx, rule.when)) continue;
    matches.push({
      ruleId: rule.id,
      ruleVersion: rule.version,
      then: rule.then,
      provenance: rule.provenance,
    });
  }
  return matches;
}

export function evaluateRuleSet(ctx: RuleContext, ruleSet: RuleSet): RuleMatch[] {
  return evaluateRules(ctx, ruleSet.rules);
}

/** Assert a ruleset is JSON-round-trippable (data, not closures). */
export function assertSerializableRuleSet(ruleSet: RuleSet): RuleSet {
  const json = JSON.stringify(ruleSet);
  return JSON.parse(json) as RuleSet;
}
