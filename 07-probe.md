# Logging probe

## Why this exists

The calibration problem and the hardware business are the same problem. Fish Hawk-class
telemetry probes run $600–800, which is exactly why ground-truth depth data does not exist
at scale. But you do not need real-time telemetry to calibrate a model — you need a log.

A logging-only probe records depth, temperature, and speed at the ball and dumps to the
phone when it comes back aboard. Every unit sold is a calibration sensor. This is the one
piece of the whole plan that is genuinely hard for a competitor to copy.

## v1 — logging only

**BOM sketch** (validate before trusting any of these numbers):

| Part | Note |
|---|---|
| MS5837-30BA | pressure/temp, 30 bar, I2C, marine-rated |
| nRF52840 module | BLE, low power, plenty of flash |
| Small LiPo + charge IC | Qi charging avoids a connector, which is the usual failure point |
| Paddle wheel or differential-pressure speed sensor | Optional in v1; speed at the ball is the hardest measurement |
| Machined delrin or 3D-printed housing, potted, O-ring | Rated well past expected depth |

Target BOM $40–60 at low volume. Target price $150–200 into a market whose only
alternative is $700. Do not over-engineer v1: depth and temperature alone, logged at 1 Hz,
already solve the calibration problem.

## Firmware behavior

- Wake on pressure change above a threshold; sleep otherwise. Battery life is measured in
  seasons, not hours.
- Log at 1 Hz to flash as a ring buffer. Timestamp from an internal RTC, resynced from the
  phone on every connection — clock drift is expected and corrected at ingest, not on the
  device.
- No configuration on the device. No buttons. It records when it is wet and deep, and
  stops when it is not.

## BLE service

One custom GATT service:

- `deviceInfo` — serial, firmware version, battery
- `sessionList` — read: available logged sessions with start time and sample count
- `sessionData` — notify: chunked sample stream, CRC per chunk, resumable
- `timeSync` — write: phone time, applied as an offset, never overwriting logged data

Samples are packed binary, not JSON. A four-hour session at 1 Hz is 14,400 samples and it
transfers over a BLE link on a boat.

## Ingest and fitting

1. Phone pulls the session, stores raw samples in IndexedDB, syncs on return
2. Server joins samples to the trip's track and rig snapshots by timestamp
3. The `calibration` BullMQ job fits drag coefficients by minimizing error between
   `solveDownrigger()` output and measured depth across all matched samples
4. Fits are stored per scope: `global`, `boat`, `rig`. The engine uses the narrowest
   available fit and reports which one in `assumptions`

Every fit records its residual standard error, which becomes the `sigma` for
`confidence: 'fitted'` results. This is how a $180 probe makes the free calculator better
for people who will never own one.

## Contributor consent

Probe data uploads are opt-in with a plain-language explanation of what is contributed and
what is not: physics samples, yes; positions, no. Never bundle this consent into the terms
of sale.

## v2 — live telemetry

Uses the stainless downrigger cable as a conductor with a seawater return, which is the
established approach and is genuinely difficult: signal integrity through a corroding
connection under load. This is what commands the premium price. Do not attempt it until v1
has sold units and the fitting pipeline works.
