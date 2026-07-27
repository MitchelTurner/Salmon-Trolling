# Build backlog

One task per composer session. Do not start a phase until the previous phase's gate is
met. Each task lists the files it may touch and what "done" means.

---

## Phase 0 — scaffold

**0.1 Monorepo**
Files: root config, `packages/units`, `packages/engine`, `packages/shared`, `packages/db`,
`apps/api`, `apps/web`.
Done: pnpm workspaces + Turborepo, TS strict everywhere, vitest wired, `pnpm build` and
`pnpm test` green from a clean clone. No app code yet.

**0.2 Units package**
Files: `packages/units/**`.
Done: branded types `Meters`, `Feet`, `MetersPerSecond`, `Knots`, `Kilograms`, `Pounds`,
`Newtons`, `Celsius`, `Fahrenheit`, `Radians`, `Degrees`. Conversion functions in both
directions with property-based round-trip tests. **Zero dependencies.** A bare `number`
must not be assignable to a branded type — verify with a type-level test.

**0.3 Database**
Files: `packages/db/**`.
Done: `prisma/schema.prisma` from this repo applied, PostGIS extension migration,
seed script with a personal org, a boat, three rigs, and the shared gear catalog.

---

## Phase 1 — depth engine and calculator

Gate to exit: 100 people use the calculator twice in a week without being asked to.

**1.1 Constants**
Files: `packages/engine/src/constants.ts`.
Done: every constant from `docs/02-depth-engine.md` present, each with a source comment
and a `MEASURED` / `MANUFACTURER` / `ESTIMATED` tag, each `ESTIMATED` one carrying a
stated uncertainty and a `TODO(calibrate)`. A test asserts every exported constant has a
tag — this is enforceable and should be enforced.

**1.2 Downrigger solver**
Files: `packages/engine/src/models/downrigger.ts`, tests.
Done: the segmented integration exactly as specified, including the normal-velocity term
and the upward component of normal drag. Golden regression fixtures. Convergence test:
output stable to <0.01 m between 200 and 2000 segments. Output within the sanity-anchor
table in the spec.

**1.3 Leader and attractor geometry**
Files: `packages/engine/src/models/leader.ts`.
Done: lure position relative to the ball, given leader length, attractor drag, and speed.

**1.4 Diver, leadcore, weighted, flatline**
Files: `packages/engine/src/models/*.ts`, `packages/engine/src/data/divers.ts`.
Done: curve-fitting from manufacturer chart data, `outOfRange` outside the fitted domain,
shared integration path reused for weighted line rather than duplicated.

**1.5 STW resolution**
Files: `packages/engine/src/stw.ts`.
Done: the three-tier priority from the spec, each returning the right `confidence` and
populating `assumptions`. A test asserts bare-SOG input always produces the loud warning
string.

**1.6 Uncertainty**
Files: `packages/engine/src/uncertainty.ts`.
Done: composed sigma per the spec, RSS propagation, `sigma > 0.2 * depth` flagged.

**1.7 Turn dynamics and spread**
Files: `packages/engine/src/spread.ts`.
Done: per-rig local speed under a turn rate, per-rod depth swing, tangle warning when
predicted horizontal positions converge.

**1.8 Calculator UI**
Files: `apps/web/src/routes/calculator/**`, `apps/web/src/format/**`.
Done: works fully offline with no account. Rig builder for all delivery types. Live
recompute on every input change. The depth column signature element from
`docs/10-design.md`. Assumptions and confidence always visible. Passes the glove-and-glare
rules. Lighthouse PWA installable.

**1.9 Public calc endpoints**
Files: `apps/api/src/calc/**`.
Done: `POST /calc/depth`, `POST /calc/spread`. Same engine package, no reimplementation.
IP rate limiting. No input logging beyond aggregate counts.

---

## Phase 2 — logging and sync

**2.1 Local store** — Dexie schema, all domain tables, `syncQueue`, quota warning at 80%.
**2.2 Trip recording** — start/close, position ring buffer, 1 Hz persist, Douglas-Peucker
on close, works with the screen off.
**2.3 Catch logging** — append-only with rig and depth snapshots, correction via
`supersedesId`, photo capture.
**2.4 Voice logging** — "coho, twelve pounds, forty-five feet, green flasher" parsed to a
draft catch the angler confirms. Hands are wet and cold; this is the biggest UX unlock in
the product. Never auto-submit.
**2.5 Sync** — `POST /sync`, idempotent by op id, resumable batches, per-op results,
partial success as the normal path.
**2.6 Harvest record** — one-tap draft, angler confirms every entry, never auto-submitted.

---

## Phase 3 — conditions

Gate to exit: 20 people pay for a season.

**3.1 Integrations** — one task each for CO-OPS, NWS, NDBC, Open-Meteo, behind interfaces
with recorded fixtures and per-source TTLs from `docs/04-data-sources.md`.
**3.2 ADF&G ingest** — scraper with change detection, human review queue, fail-closed on
parse error, `parseOk = false` records surfaced rather than hidden.
**3.3 Sun/moon** — computed in `packages/engine`, no network.
**3.4 Bathymetry tiles** — one-time generation to object storage, "not for navigation"
label baked into the render.
**3.5 Bundle generation** — `bundles` queue, deterministic output, signed, Redis-cached.
**3.6 Dock prefetch UX** — bundle age prominent, refresh prompt before departure.
**3.7 Billing** — Stripe checkout, portal, webhooks idempotent by event id, season pass.

---

## Phase 4 — recommendations

**4.1 Rules as data** — `packages/engine/src/rules/`, versioned, each with provenance.
**4.2 Recommendation output** — `reasons` non-empty enforced by the type, `score` capped
at 0.6 for `basis: 'rules'`.
**4.3 Feedback loop** — thumbs-down asks the one question: what did you run instead?
**4.4 Effort logging** — trips with zero catches recorded and used. Every naive
implementation throws these away; they are the denominator.
**4.5 Per-user fitting** — gradient-boosted trees on tabular features, per-user first,
pooled with per-user offset second. Not before there is real data.

---

## Phase 5 — charter

Gate to exit: 3 operators run a full season.

**5.1 Roles and multi-boat.**
**5.2 Guest catch reports** — auto-generated at trip close, emailed. The demo feature.
**5.3 Fish tags** — printable codes at the dock, guest status page.
**5.4 Processing manifests** — a document the processor will actually accept.
**5.5 Shipping records** — carrier, tracking, guest notification.
**5.6 Bookings, deposits, waivers, crew scheduling, cancellation and rebooking.**

---

## Phase 6 — probe

**6.1 BLE client** — session list, chunked resumable transfer, CRC, time sync as offset.
**6.2 Sample ingest** — join to track and rig timeline, clock drift correction at ingest.
**6.3 Fitting job** — minimize model-vs-measured error, store per scope with RMSE.
**6.4 Engine uses fits** — narrowest available scope, reported in `assumptions`.
**6.5 First field golden** — the first `test/golden/field/*.json`. This is the moment the
product becomes real.
**6.6 Firmware** — separate repo, `firmware/probe`, specified in `docs/07-probe.md`.

---

## Phase 7 — derby

**7.1 Public leaderboard.** **7.2 Registration and Stripe.** **7.3 Offline weigh-in
station.** **7.4 Audit trail and dispute handling** — derbies get disputed; the audit trail
is the product. **7.5 Per-derby rules engine.**

---

## Phase 8 — programmatic calculators

**8.1 Data manifest and gating** — never generate a page without a `MANUFACTURER` or
`MEASURED` source behind it.
**8.2 Static generation** per delivery type, model, and setting.
**8.3 SSR default result** so the page has content without JS.
**8.4 Measurement** — return visits within seven days without a referral is the only
metric that matters.

---

## Standing reminders

- Depth results always carry confidence and assumptions.
- Regulatory surfaces always render the disclaimer with a fetch date.
- Community data is aggregated, delayed 24h, fuzzed to 1 km, always.
- No navigational guidance, ever.
