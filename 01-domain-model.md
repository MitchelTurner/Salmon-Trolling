# Domain model

## The core noun is a Rig, not a rod

A **Rig** is one complete presentation in the water. It is what the depth engine takes as
input and what a Catch is attributed to. Getting this abstraction right is the difference
between a tool people use and a form people abandon.

```
Rig
  ├── delivery      how the gear is taken down
  │     DOWNRIGGER | DIVER | LEADCORE | WIRE | WEIGHTED | FLATLINE
  ├── deliveryConfig  discriminated union, per delivery type
  ├── mainline      type, diameter, test
  ├── attractor?    flasher / dodger — model, size, finish
  ├── leaderLength
  ├── lure          type, size, color, finish
  └── stackPosition  for stacked releases on one rigger
```

`deliveryConfig` discriminated union:

- `DOWNRIGGER` — cableOut, ballMass, ballShape, cableDiameter, releaseHeight
- `DIVER` — model, size, settingIndex, lineOut, addedWeight
- `LEADCORE` — colorsOut, backingOut, leaderOut
- `WIRE` — lineOut, wireDiameter, addedWeight
- `WEIGHTED` — lineOut, weightMass, weightShape
- `FLATLINE` — lineOut

## Entities

- **Boat** — belongs to an Org. Holds sensor capability flags (`hasPaddleWheel`,
  `hasN2K`, `hasProbe`) which drive engine confidence.
- **Trip** — one outing. Owns Tracks, Catches, and a snapshot of the conditions bundle
  used. Immutable once closed.
- **TrackPoint** — time, position, SOG, COG, heading, STW if available, depth sounder,
  sea temp. Downsampled on the client before sync.
- **Catch** — an append-only event. Time, position (fuzzed for sharing), species, length,
  mass, released/kept, and a **snapshot of the Rig and computed depth at that moment**.
  The snapshot matters: rigs get changed during a trip and a foreign key would silently
  rewrite history.
- **GearItem** — the user's library of flashers, lures, leaders. Shared catalog seeded
  from manufacturer data; users can add private items.
- **Spot** — a named place with a geometry (point or line for a troll pass). Private by
  default.
- **ConditionsBundle** — the prefetched offline package for a region and time window.
- **ProbeSample** — ground-truth depth/temp/speed from a logging probe, keyed to a Rig
  and a moment. The training data for calibration.
- **CalibrationFit** — a fitted parameter set, scoped globally, per-boat, or per-rig.
- **Regulation** — advisory record with source URL and fetch time.
- **HarvestRecord** — the angler's own confirmed legal record entries.

## Identity and sync

- All ids are client-generatable ULIDs. The boat is offline when records are created;
  the server never assigns identity.
- Catches and TrackPoints are **append-only events**. Never updated, only superseded by a
  correction event. This makes sync conflict-free for the highest-volume tables.
- Mutable entities (Rig, GearItem, Spot, Boat) use last-write-wins on a per-field basis
  with a `updatedAt` vector. Conflicts are rare and low-stakes.

## Multi-tenancy

Everything is scoped to an **Org**. A solo angler gets an implicit personal Org of one.
This means the charter product is not a bolt-on later — it is the same shape from day one,
which is the single highest-leverage decision in this document.
