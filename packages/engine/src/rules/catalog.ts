/**
 * Seed folk-knowledge rules for Southeast Alaska trolling.
 *
 * Sources are intentionally honest: unvalidated local practice until Phase 4b
 * has enough logged effort to fit weights. Do not invent physics constants here.
 */

import type { Rule, RuleSet } from './types.js';

/** Bump when any rule is added, removed, or semantically changed. */
export const RULESET_VERSION = 1;

export const RULES: readonly Rule[] = [
  {
    id: 'low-light-glow',
    version: 1,
    when: {
      any: [
        { field: 'lightLevel', op: 'lt', value: 0.25 },
        { field: 'turbidity', op: 'gt', value: 0.6 },
      ],
    },
    then: {
      finishes: ['glow', 'uv'],
      weight: 0.7,
      factor: 'light',
      effect: 'favors glow and UV finishes',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'bright-daylight-natural',
    version: 1,
    when: {
      all: [
        { field: 'lightLevel', op: 'gte', value: 0.7 },
        { field: 'turbidity', op: 'lte', value: 0.35 },
      ],
    },
    then: {
      finishes: ['natural', 'bright'],
      weight: 0.55,
      factor: 'light',
      effect: 'favors natural and bright finishes in clear daylight',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'overcast-uv',
    version: 1,
    when: {
      all: [
        { field: 'cloudCover', op: 'gte', value: 0.7 },
        { field: 'lightLevel', op: 'between', value: [0.25, 0.7] },
      ],
    },
    then: {
      finishes: ['uv', 'chrome'],
      weight: 0.5,
      factor: 'light',
      effect: 'overcast mid-light favors UV and chrome',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'flood-tide-current',
    version: 1,
    when: {
      all: [
        { field: 'tideStage', op: 'in', value: ['flood', 'slack_flood'] },
        { field: 'currentSpeedMs', op: 'gt', value: 0.3 },
      ],
    },
    then: {
      weight: 0.65,
      speedBiasMs: 0.05,
      factor: 'tide',
      effect: 'building flood with current favors a slightly faster troll',
    },
    provenance: {
      source: 'Southeast tide-stage folklore, unvalidated',
      status: 'unvalidated',
    },
  },
  {
    id: 'slack-water-slow',
    version: 1,
    when: {
      any: [
        { field: 'tideStage', op: 'eq', value: 'slack_ebb' },
        {
          all: [
            { field: 'currentSpeedMs', op: 'lte', value: 0.15 },
            { field: 'tideStage', op: 'in', value: ['slack_flood', 'slack_ebb'] },
          ],
        },
      ],
    },
    then: {
      weight: 0.45,
      speedBiasMs: -0.1,
      depthBiasM: 2,
      factor: 'tide',
      effect: 'slack water favors slower presentations a touch deeper',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'king-peak-weeks',
    version: 1,
    when: {
      all: [
        { field: 'species', op: 'eq', value: 'king' },
        // Late May–June (ISO weeks ~22–26) for Ketchikan kings.
        { field: 'weekOfYear', op: 'between', value: [22, 26] },
      ],
    },
    then: {
      weight: 0.6,
      factor: 'runTiming',
      effect: 'peak king weeks — prioritize known king water and standard summer depths',
    },
    provenance: {
      source: 'Ketchikan run timing sketch, unvalidated',
      status: 'unvalidated',
    },
  },
  {
    id: 'coho-build-august',
    version: 1,
    when: {
      all: [
        { field: 'species', op: 'eq', value: 'coho' },
        { field: 'weekOfYear', op: 'between', value: [31, 36] },
      ],
    },
    then: {
      weight: 0.6,
      speedBiasMs: 0.15,
      factor: 'runTiming',
      effect: 'coho build favors a faster, higher presentation',
    },
    provenance: {
      source: 'Ketchikan run timing sketch, unvalidated',
      status: 'unvalidated',
    },
  },
  {
    id: 'pink-flood-july',
    version: 1,
    when: {
      all: [
        { field: 'species', op: 'eq', value: 'pink' },
        { field: 'weekOfYear', op: 'between', value: [27, 31] },
      ],
    },
    then: {
      weight: 0.5,
      factor: 'runTiming',
      effect: 'pink flood weeks — expect competition and school-driven hits',
    },
    provenance: {
      source: 'Ketchikan run timing sketch, unvalidated',
      status: 'unvalidated',
    },
  },
  {
    id: 'feeder-king-winter',
    version: 1,
    when: {
      all: [
        { field: 'species', op: 'eq', value: 'feeder_king' },
        {
          any: [
            { field: 'weekOfYear', op: 'lte', value: 12 },
            { field: 'weekOfYear', op: 'gte', value: 44 },
          ],
        },
      ],
    },
    then: {
      weight: 0.65,
      depthBiasM: 8,
      speedBiasMs: -0.2,
      finishes: ['natural', 'glow'],
      factor: 'runTiming',
      effect: 'winter feeder kings — deeper, tighter to bait, slower',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'cold-column-deeper',
    version: 1,
    when: { field: 'seaTempC', op: 'lt', value: 8 },
    then: {
      weight: 0.4,
      depthBiasM: 5,
      factor: 'seaTemp',
      effect: 'cold surface water biases presentations deeper',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'high-turbidity-uv',
    version: 1,
    when: { field: 'turbidity', op: 'gt', value: 0.6 },
    then: {
      finishes: ['uv', 'glow'],
      weight: 0.6,
      factor: 'turbidity',
      effect: 'silty or runoff-stained water favors high-contrast UV and glow',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'local_practice',
    },
  },
  {
    id: 'dark-moon-glow',
    version: 1,
    when: {
      all: [
        { field: 'moonIllumination', op: 'lt', value: 0.25 },
        { field: 'lightLevel', op: 'lt', value: 0.35 },
      ],
    },
    then: {
      finishes: ['glow'],
      weight: 0.35,
      factor: 'moon',
      effect: 'dark moon near low light favors glow finishes',
    },
    provenance: {
      source: 'local practice, unvalidated',
      status: 'unvalidated',
    },
  },
];

export const DEFAULT_RULE_SET: RuleSet = {
  version: RULESET_VERSION,
  rules: RULES,
};
