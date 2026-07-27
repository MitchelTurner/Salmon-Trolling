# Programmatic calculators

## The play

The depth engine is already built and costs nothing to serve. Wrap it in free public
calculator pages targeting high-intent, near-zero-competition search terms:

- downrigger depth calculator
- leadcore depth chart, per number of colors
- dive curve, per diver model and setting
- trolling speed to lure depth
- blowback calculator
- wire line depth calculator

These rank well because free tools rank well, the content is genuinely useful rather than
spun, and it never goes stale. Run the terms through the keyword cost tooling before
committing, but the CPCs in this space are almost certainly under a dollar.

## Implementation

- Static generation at build time from a data manifest: one page per
  `(delivery type × model × setting)` combination that has real data behind it
- Each page: an interactive calculator above the fold, a generated reference table below,
  and a plain-English explanation of what actually determines depth for that setup
- Server-rendered result for the default inputs so the page has real content without JS
- `/calc/*` endpoints are the same engine the app uses. One implementation, no drift.

## Rules

- **Do not generate a page for a combination you do not have data for.** A page with an
  invented dive curve is worse than no page: it is wrong, it will rank, and it will be
  screenshotted. Gate generation on the presence of a `MANUFACTURER` or `MEASURED` source.
- Every page shows its data source and the model's uncertainty. This is the differentiator
  against the existing chart-scan pages, not a legal hedge.
- No email gate, no signup wall, no interstitial. The tool is the marketing.
- One quiet contextual link to the app, below the result, after the value is delivered.

## Measurement

Track: impressions and clicks per page template, calculator completions, and the single
metric that matters — return visits within seven days without a referral. That is the
signal that the tool is genuinely useful rather than merely findable.
