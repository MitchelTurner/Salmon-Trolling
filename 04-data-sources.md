# External data sources

Every one of these lives behind an interface in `apps/api/src/integrations/<source>/` with
recorded fixtures. None is called from a service directly.

| Source | Use | Cadence | Cache TTL | Notes |
|---|---|---|---|---|
| NOAA CO-OPS | Tide predictions, currents, water level, water temp | Predictions are static; observations 6 min | Predictions 30 days, observations 10 min | Ketchikan station 9450460 plus current stations in the Narrows. Predictions can be precomputed a year out — never poll them. |
| NOAA NWS API | Marine zone forecasts | ~hourly | 1 h | Zone-based, not point-based, for marine. Store issuing office and issue time; the UI must display them. |
| NDBC | Buoy observations | ~hourly | 30 min | Sparse coverage in SE Alaska. Expect gaps; never interpolate silently across one. |
| Open-Meteo Marine | Waves, SST, swell | hourly | 3 h | Free, generous limits, good gap-filler where NDBC is absent. |
| NOAA ERDDAP | Satellite SST | daily | 12 h | Cloud cover makes this patchy in Southeast. Treat as a bonus, not a dependency. |
| NOAA ENC / bathymetry | Bottom contours | static | permanent | Vector tiles generated once into object storage. Label "not for navigation" on every render. |
| ADF&G | Run timing, escapement, **emergency orders**, regulations | irregular, in-season | 6 h, and always show fetch time | The emergency orders are the whole point. No public JSON API — this is scraping, so it needs a change-detection job, a human review queue, and a hard fail-closed: if parsing breaks, show the last known record with its age, never a guess. |
| Sun / moon | Light level, twilight, phase | — | — | Computed locally in `packages/engine`. No API. No network dependency for the single most important recommendation input. |

## Cache policy

Match TTL to the source's real update cadence, never to convenience. A tide prediction
table is valid for a year; re-fetching it hourly is both wrong and rude. A marine forecast
older than three hours should be visibly stale in the UI.

## Rate limiting and citizenship

These are public goods funded by taxes. Rate-limit every outbound integration, back off on
429/5xx with jitter, set a descriptive User-Agent with a contact address, and cache
aggressively. Getting blocked by NOAA would end the product.

## Bundles

The `bundles` queue precomputes, per region and per 48h window, a single signed blob
containing tides, currents, forecast, regs snapshot, and bathymetry tile references. The
boat downloads one blob at the dock over wifi. See `docs/05-offline-sync.md`.

Region definitions live in `packages/shared/src/regions.ts` and start with exactly one:
Ketchikan and the surrounding waters. Do not generalize the region system before there is
a second region with a real user in it.
