# API surface

REST, JSON, Zod-validated both directions. All routes org-scoped from the JWT — a
client-supplied `orgId` is never trusted.

## Public, unauthenticated

```
POST /calc/depth              body: rig + conditions   -> DepthResult
POST /calc/spread             body: rig[] + conditions -> DepthResult[] + tangleWarnings
GET  /calc/chart/:kind        static dive/depth chart data for the SEO calculators
```

These power the free calculator and the programmatic tools. Rate-limited by IP, no
account, no logging of inputs beyond aggregate counts. They must stay fast and boring.

## Authenticated

```
GET  /me
GET  /bundles/:regionId?window=48h
POST /sync                     batched, idempotent ops
GET  /trips  POST /trips  GET /trips/:id  POST /trips/:id/close
GET  /rigs   POST /rigs   PATCH /rigs/:id
GET  /gear   POST /gear
GET  /spots  POST /spots
POST /catches                  append-only; corrections via supersedesId
GET  /conditions/:regionId     live, for when there is signal
POST /recommendations          body: context -> Recommendation[]
POST /recommendations/:id/feedback
POST /probe/samples            batch upload from a paired probe
GET  /regs/:regionId
```

## Charter (org role required)

```
GET  /org/boats  POST /org/boats
GET  /org/crew   POST /org/crew/invite
GET  /org/trips                 across all boats
POST /org/trips/:id/report      generate guest catch report
GET  /org/processing            fish handoff manifests
```

## Derby

```
GET  /derbies/:slug             public leaderboard
POST /derbies/:slug/register    Stripe checkout
POST /derbies/:slug/weighins    station operator role
```

## Billing

```
POST /billing/checkout
POST /billing/portal
POST /webhooks/stripe           signature-verified, idempotent by event id
```

## Conventions

- Errors: RFC 7807 problem+json. `type` is a stable URL, `detail` is human-readable and
  safe to display.
- Pagination: cursor-based, never offset. Boats sync in ULID order.
- Every response carries `generatedAt`. The client shows data age everywhere.
- Versioning: `Accept: application/vnd.troll.v1+json`. Bump only for breaking changes;
  additive fields never bump.
