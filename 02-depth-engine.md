# Depth engine

The most important document here. Everything else is a shell around this.

## What it computes

Given a Rig, a speed through water, and a sea state, return for each rig:

```ts
interface DepthResult {
  depth: Meters;            // true vertical depth of the lure
  setback: Meters;          // horizontal distance astern of the rod tip
  ballDepth?: Meters;       // downrigger only
  blowbackAngle?: Radians;  // at the rod tip, downrigger only
  sigma: Meters;            // 1-sigma uncertainty
  confidence: 'measured' | 'fitted' | 'modelled' | 'extrapolated';
  outOfRange: boolean;
  assumptions: string[];    // every ESTIMATED constant and substituted input
}
```

`assumptions` is not optional and is not for debugging. It is rendered in the UI.

## The one thing everybody else gets wrong

**Depth is a function of speed through water, not speed over ground.** In Tongass Narrows
on a strong flood you can be making 4.5 kt SOG while the gear only sees 2.2 kt. Every
lookup table and most apps silently use SOG and are therefore wrong by a large margin
exactly where currents matter most — which is exactly where the fish are.

Priority order for the STW input:

1. Paddle wheel / N2K `speedThroughWater` — `confidence: 'measured'`
2. `SOG_vector − predictedCurrent_vector` from the nearest NOAA current station —
   `confidence: 'modelled'`, and `assumptions` must include the station id, its distance,
   and the prediction time offset
3. Bare SOG — `confidence: 'modelled'`, `assumptions` includes a loud
   `"no current correction available; depth may be off by 20%+ in tidal current"`

Never silently do (3) while presenting like (1).

## Coordinate system

`x` horizontal, positive astern. `z` positive downward. `θ` is the angle of the cable
from vertical, so θ = 0 is straight down and θ → 90° is laid out flat.

## Model A — downrigger (segmented towed-cable integration)

The ball alone barely blows back. A 10 lb lead sphere at 2.5 kt generates roughly 2.6 N of
drag against roughly 40 N of submerged weight — under 4°. The blowback everyone actually
sees comes from **the cable** (tens of newtons distributed over its length) and **the
terminal tackle** (a large flasher is worth several pounds of drag on its own). This is
why the same rigger setting fishes deeper with a bare hoochie than with an 11" flasher,
and it is why a lookup table indexed only on speed and cable-out cannot be right.

So: integrate from the ball upward, accumulating drag segment by segment.

```
solveDownrigger(cableOut, stw, ball, cable, terminalDrag, segments = 200):

  W_ball  = ball.mass * (1 - RHO_SEAWATER / RHO_LEAD) * G      // submerged weight
  A_ball  = frontalArea(ball.mass, ball.shape)
  D_ball  = 0.5 * RHO_SEAWATER * ball.cd * A_ball * stw^2

  H = D_ball + terminalDrag        // accumulated horizontal force
  V = W_ball                       // accumulated vertical force
  x = 0; z = 0
  ds = cableOut / segments
  w_cable = cable.linearMass * (1 - RHO_SEAWATER / RHO_STEEL) * G   // N per metre

  for i in 1..segments:
    theta = atan2(H, V)
    x += ds * sin(theta)
    z += ds * cos(theta)

    // Flow is horizontal. Cable axis is (sin θ, cos θ).
    // Normal component of flow is v·cos θ, tangential is v·sin θ.
    v_n = stw * cos(theta)
    v_t = stw * sin(theta)

    D_n = 0.5 * RHO_SEAWATER * CD_CYL_NORMAL * cable.diameter * ds * v_n^2
    D_t = 0.5 * RHO_SEAWATER * CD_CYL_TANGENT * PI * cable.diameter * ds * v_t^2

    // normal drag acts perpendicular to the cable: (cos θ, −sin θ)
    // tangential drag acts along it: (sin θ, cos θ)
    H += D_n * cos(theta) + D_t * sin(theta)
    V += w_cable * ds - D_n * sin(theta) + D_t * cos(theta)

  return { ballDepth: z, setback: x, blowbackAngle: atan2(H, V) }
```

Two things worth understanding before you touch this:

- The normal-velocity term `v·cos θ` is self-limiting. As the cable lays over, less of the
  flow is normal to it, so drag falls off and the angle stops running away. This is why a
  naive "apply full drag along the whole cable" model overpredicts blowback badly.
- Normal drag has an **upward** component (`−D_n·sin θ`). Cable drag lifts. Dropping this
  term makes the model wrong in the direction people intuitively expect it to be wrong,
  which makes the error hard to spot.

The lure sits below and behind the ball by the leader geometry:

```
lureDepth   = ballDepth + releaseDropHeight − leaderRise(leader, attractor, stw)
lureSetback = ballSetback + leaderSetback(leader, attractor, stw)
```

Model the leader as a short version of the same integration with the attractor's drag at
its end and no weight — it rises, it does not sink.

### Worked sanity anchor

10 lb lead sphere, 100 ft of 0.045" stainless, 2.5 kt STW, 11" flasher + hoochie
(≈10 N estimated drag):

| Quantity | Value |
|---|---|
| Ball submerged weight | ≈ 40.5 N |
| Ball drag | ≈ 2.6 N |
| Total cable normal drag | ≈ 25–35 N |
| Blowback angle at rod tip | ≈ 45–50° |
| True ball depth | ≈ 84 ft |
| Setback | ≈ 50 ft |

**These numbers are model output, not measurements.** They are here so you can tell
immediately whether an implementation is in the right universe. They are consistent with
the 15–25% blowback anglers report for this setup, which is weak corroboration and nothing
more. Do not present them to users as validated until Phase 6 replaces them with probe
data.

## Model B — diving planers

Do not hard-code dive charts. Fit them.

```
depth = k * lineOut^alpha * (stw / V_REF)^beta
```

Parameters are fitted per `(model, size, settingIndex, lineType, lineDiameter,
addedWeight)` by least squares against the manufacturer's published chart, which is
entered once as data in `packages/engine/src/data/divers.ts` with a `MANUFACTURER` tag and
the chart's source URL. Store the fit's valid speed and line-out range and set
`outOfRange` outside it.

## Model C — leadcore and wire

```
depthPerColor(stw) = c0 * (stw / V_REF)^(-gamma)
depth = colorsOut * depthPerColor(stw) + backingSag + leaderRise
```

`c0` and `gamma` start as `ESTIMATED` (roughly 5 ft per 10-yd color at 2 kt is the
folklore starting point) and become `MEASURED` from probe data. Flag heavily until then.

## Model D — weighted line and flatline

Equilibrium between weight and total line drag. At long sets the **line** dominates, not
the weight, so use the same segmented integration as Model A with the weight substituted
for the ball and no cable — the code path is shared.

## Turn dynamics

In a turn, the inside rod slows and sinks, the outside rod speeds up and rises, often by
15–20 ft. This is where fish get caught and where gear gets tangled, and nobody ships it.

Given turn rate `omega` (rad/s, from GPS heading rate) and a rig whose gear sits at
setback `x` and lateral offset `y` from the boat's centerline:

```
localSpeed = stw + omega * (lateralOffsetFromTurnCenter)
```

where the gear's position astern rotates about the turn center. Recompute each rig's depth
at its own `localSpeed` and expose the delta. Two useful outputs fall straight out:

- per-rod depth swing during the turn
- **tangle risk**: if two rigs' predicted horizontal positions converge within a
  threshold, warn before the turn completes

## Uncertainty

`sigma` is composed, not guessed:

- STW source: measured ±0.1 kt, current-corrected ±0.4 kt, bare SOG ±1.0 kt or worse
- Each `ESTIMATED` constant contributes its stated uncertainty
- Fitted models contribute their residual standard error
- Propagate by evaluating the model at ±1 sigma on each dominant input and taking the RSS

If `sigma > 0.2 * depth`, the UI shows a range rather than a number.

## Constants file contract

`packages/engine/src/constants.ts`. Every entry looks like this:

```ts
/** Seawater density at 10 °C, 32 PSU. Source: UNESCO EOS-80. MEASURED */
export const RHO_SEAWATER = 1025 as KgPerM3;

/** Drag coefficient, smooth sphere, Re 1e4–2e5. Source: Schlichting. MANUFACTURER */
export const CD_SPHERE = 0.47;

/** Normal drag coefficient, smooth cylinder, Re ~1e3. ESTIMATED ±20%
 *  TODO(calibrate): refit from probe data in Phase 6 */
export const CD_CYL_NORMAL = 1.1;
```

Needed at minimum: `RHO_SEAWATER`, `NU_SEAWATER` (temperature-dependent — SE Alaska water
is 7–13 °C, use ≈1.35e-6 m²/s, not the 20 °C textbook value), `RHO_LEAD`, `RHO_STEEL`,
`G`, `CD_SPHERE`, `CD_PANCAKE`, `CD_TORPEDO`, `CD_CYL_NORMAL`, `CD_CYL_TANGENT`, plus a
drag table for attractors keyed by model and size.

## Tests

`packages/engine/test/golden/` holds two distinct kinds of file, and conflating them is a
correctness hazard:

- `regression/*.json` — locks current model behavior so refactors are safe. Generated by
  the model. Regenerating is fine when physics changes intentionally.
- `field/*.json` — real measured depths from probe runs or sonar-marked balls, with the
  measurement method recorded. **Never regenerate these.** When the model disagrees with
  a field vector, the model is wrong.

Start with `regression/` only, and treat the first `field/` file as the moment the
product becomes real.
