# Recommendation engine

## Be honest about what this is

With no data, this is a rules engine wearing a hat. That is fine — ship it as a rules
engine with visible reasoning and let it become a model. The failure mode to avoid is that
it will *look* smart long before it *is* smart, and the first serious user who has a bad
morning will catch you out.

## Output contract

```ts
interface Recommendation {
  depthBand: { min: Meters; max: Meters };
  speedBand: { min: MetersPerSecond; max: MetersPerSecond };
  attractor: GearSuggestion | null;
  lure: GearSuggestion;
  leaderLength: Meters;
  reasons: Reason[];        // never empty, always rendered
  score: number;            // 0-1, calibrated, not a vibe
  basis: 'rules' | 'personal' | 'community';
}

interface Reason {
  factor: string;           // 'light', 'tide', 'turbidity', 'seaTemp', 'runTiming'
  observation: string;      // "overcast, 40 min before sunrise"
  effect: string;           // "favors glow and UV finishes"
  weight: number;
}
```

A recommendation without reasons must fail type-checking, not just review. Anglers will
trust this only if they can see why and argue with it.

## Inputs, in rough order of local signal strength

1. **Tide stage and current** — arguably the strongest single predictor in Southeast, and
   it feeds the STW correction anyway so you have it for free
2. **Run timing by species and week** — Ketchikan kings peak late May–June, coho build
   through August, pinks flood July. Winter feeder kings are a different game entirely:
   deeper, tighter to bait, slower
3. **Light** — civil twilight, sun angle, cloud cover, moon phase. Drives the
   glow/UV/bright-vs-natural decision more than anything else
4. **Water column** — SST, thermocline depth, turbidity from rain runoff and glacial silt
5. **Bathymetry and structure** — contours, rips, kelp edges, the drop-offs people
   actually troll
6. **Barometric trend**, wind, sea state
7. **The user's own log** — after ~20 trips this outranks everything above it

## Phase 4a — rules

A declarative rule set in `packages/engine/src/rules/`, versioned, each rule carrying its
own provenance:

```ts
{
  id: 'low-light-glow',
  when: (ctx) => ctx.lightLevel < 0.25 || ctx.turbidity > 0.6,
  then: { finishes: ['glow', 'uv'], weight: 0.7 },
  source: 'local practice, unvalidated',
}
```

Rules are data, not code branches. This matters because Phase 4b replaces their weights
with fitted ones and you want that to be a data migration, not a rewrite.

## Phase 4b — fitting

Once a user has enough logged effort (not enough *catches* — effort is the denominator and
forgetting it is how every fishing app produces garbage statistics):

- Model catch-per-hour as a function of the feature vector above
- Start with gradient-boosted trees on tabular features. Resist anything fancier; the
  data will be small, noisy, and heavily confounded by where people chose to fish
- Fit per-user first, then pooled with a per-user offset. Regional pooling only once
  there are enough users in a region to anonymize properly
- **Log effort with no catch.** A trip with zero fish is the most information-dense record
  in the database and every naive implementation throws it away

## Feedback

Every recommendation gets a thumbs-down that asks one question: what did you run instead?
That single interaction is worth more than any amount of passive telemetry, and it is the
only path from rules to model.

## What not to do

- No confidence scores derived from nothing. If `basis: 'rules'`, cap `score` at 0.6 and
  say why in the UI.
- No "hot lure of the day" leaderboards. They create a feedback loop where the
  recommendation causes the data that justifies it.
- No recommendation that cannot be expressed as something an experienced local would
  actually say out loud.
