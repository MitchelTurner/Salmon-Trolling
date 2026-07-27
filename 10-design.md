# Design system

## Direction

Grounded in **NOAA nautical chart conventions**, extending the existing dead-reckoning
brand rather than inventing a second visual language. This is not decoration — chart
convention is a century-old information design system built for exactly this problem:
dense quantitative data, read quickly, in bad light, by someone with other things to do.

The signature element is the **depth column**: a vertical scale down the left of the main
screen rendered like a chart sounding column, with each rig's computed lure position
plotted on it live, moving as speed and cable change. It is the one thing this app should
be remembered by, and everything else stays quiet around it.

## Palette

Taken from chart symbology, not from a generic UI palette.

| Token | Hex | Chart meaning | Use |
|---|---|---|---|
| `deep` | `#FFFFFF` | deep water | primary surface |
| `shoal` | `#C9E3F2` | shallow water tint | secondary surfaces, depth bands |
| `flat` | `#9FD4C4` | intertidal / drying | active state, in-the-zone indicator |
| `land` | `#E8DCC0` | land buff | inactive surfaces, disabled |
| `hairline` | `#1A1A1A` | chart linework | text, rules, sounding numerals |
| `caution` | `#C4197E` | magenta: lights, cautions, restricted | alerts, regulatory notices, tangle warnings |

Magenta carries alarm on a chart, so it carries alarm here. Never use it decoratively.
Dark mode inverts to a night-vision chart mode: near-black ground, dimmed buff, magenta
preserved.

## Type

- **Data and soundings**: a condensed grotesque with tabular figures. Depth numerals are
  the hero and must align in columns. Sounding-style: integer prominent, decimal subscript.
- **Interface**: a plain neutral sans, quiet, doing no work the data should be doing.
- Type scale is small and tight except for depth readouts, which are large enough to read
  at arm's length in direct sun.

## Rules

- Hairline rules, minimal radius (2px), no shadows, no gradients. Chart plates have no
  drop shadows.
- 56px minimum hit target on primary controls. Gloves, cold hands, moving deck.
- No hover-only affordances anywhere.
- Motion is functional only: the depth marker animating to its new position when speed
  changes is information. Nothing else animates.
- Empty states are instructions, not moods. "No rigs yet — add the one you fish most."

## Copy

Marine vernacular, used correctly or not at all. Anglers will spot a wrong term instantly
and it will cost more trust than a wrong number. Cable out, not "line length". Setback, not
"horizontal distance". Stack, flasher, hoochie, leader. Sentence case, active voice, and a
control names exactly what happens: "Start trip", and the toast says "Trip started".
