# Product spec

## The thesis

Two products share a codebase, and they have very different truth values.

The **depth engine** is physics. It can be provably right, it works with the radio off,
and it is useful on day one with zero users. It is the trust anchor.

The **recommendation layer** is folk knowledge. It can only be usefully right. It is
shipped as an opinionated rules engine with visible reasoning, and it becomes a fitted
model as the catch log grows.

Everything else — logging, conditions, charter ops, the probe, derbies — hangs off those
two. Build them in that order and never let the second one borrow credibility from the
first by hiding its uncertainty.

## Users

| Segment | Job | Pays? |
|---|---|---|
| Sport troller | "How deep is my gear actually running, and what should I put down there?" | Reluctantly. Free tier is the acquisition channel. |
| Charter operator | "Run my boats, log my trips, get my guests their fish and their photos." | Yes. $50–150/boat/month is the real revenue. |
| Lodge | Same as charter, larger, with guest management | Yes, larger contracts, longer sales cycle |
| Derby organizer | Registration, weigh-ins, leaderboard, prize verification | Yes, seasonally |
| Probe owner | Ground-truth depth/temp at the ball | Hardware margin, and they feed the calibration model |

## Scope by phase

**Phase 1 — depth calculator.** Free, offline, no account required to compute. Downrigger,
diver, leadcore, weighted line, flatline. Turn dynamics. Spread view.

**Phase 2 — logging and sync.** Trips, tracks, catches, gear library. Offline-first with
sync on reconnect. Voice logging.

**Phase 3 — conditions.** Tides, currents, light, weather, SST, bathymetry for saved
spots. Region bundle prefetch at the dock. Paid tier begins here.

**Phase 4 — recommendations.** Rules engine with exposed reasoning, thumbs-down feedback,
per-user fitting once there is enough log data.

**Phase 5 — charter operations.** Multi-boat, crew logging, guest catch reports,
processor and shipping handoff.

**Phase 6 — probe.** BLE logging probe, sample upload, global drag-coefficient fitting.

**Phase 7 — derby.** Registration, Stripe, weigh-ins, leaderboard.

**Phase 8 — programmatic calculators.** Free SEO tools per lure/diver/line type.

## Explicitly out of scope

- Navigation, routing, or anything that could be mistaken for a chartplotter
- Live position sharing between users
- Real-time community hotspot maps
- Native mobile apps before the PWA has proven retention
- Any ML model before there is real logged data to fit it to

## What success looks like at each gate

- Phase 1: 100 people use the calculator twice in a week without being asked to.
- Phase 3: 20 people pay for a season.
- Phase 5: 3 charter operators run a full season on it.
- Anything short of that gate, stop and fix the previous phase rather than building the
  next one.
