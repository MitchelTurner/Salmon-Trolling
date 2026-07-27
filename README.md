# Trolling platform — Cursor build spec

A complete specification for an offline-first salmon trolling platform: a physics-based
lure depth engine, conditions and recommendation layer, catch logging, charter operations,
a hardware calibration probe, and derby management.

## How to use this with Cursor

1. Copy this whole directory to the root of a fresh repo.
2. `.cursor/rules/*.mdc` load automatically. `00-project.mdc` and `30-domain-safety.mdc`
   are `alwaysApply: true` — they are the guardrails that keep the agent from
   inventing physics constants or shipping unit bugs.
3. Work **one task at a time** from `TASKS.md`, in order. Each task names the files it
   may touch and the acceptance criteria. Paste the task text into composer along with
   `@docs/<relevant doc>`.
4. Never let the agent run more than one phase per session. Phases have hard dependencies
   and the depth engine must be correct before anything is built on top of it.

## Reading order for a human

| Doc | What it settles |
|---|---|
| `docs/00-product.md` | What is being built, for whom, and what is deliberately out of scope |
| `docs/01-domain-model.md` | The nouns, and what a "rig" actually is |
| `docs/02-depth-engine.md` | The physics. The most important document here. |
| `docs/03-recommendations.md` | The rules engine, and how it becomes a model |
| `docs/04-data-sources.md` | External APIs, their quirks, and cache policy |
| `docs/05-offline-sync.md` | The no-cell-service constraint, which shapes everything |
| `docs/06-api.md` | HTTP surface |
| `docs/07-probe.md` | The logging probe: BOM, firmware, BLE, calibration fitting |
| `docs/08-charter-derby.md` | The parts that actually generate revenue |
| `docs/09-seo-calculators.md` | Programmatic free tools as an acquisition channel |
| `docs/10-design.md` | Visual system, grounded in NOAA chart conventions |

## Non-negotiables

- The depth engine is a pure package with zero I/O and zero dependencies. It runs
  identically in a browser with the radio off and on the server.
- All internal computation is SI with branded types. Imperial exists only at the UI edge.
- No physical constant enters the codebase without a source comment and a
  `MEASURED` / `MANUFACTURER` / `ESTIMATED` tag.
- No recommendation is ever rendered without its reasons.
- Regulatory content is advisory-only, always, everywhere.
