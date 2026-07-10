# AS ABOVE

A small, motion-saturated devotional scene. An earthen altar stands under the
sky. Above it floats the Emerald Tablet — a slab of green phosphor glass in
the tradition of a Mesopotamian retro-terminal. One thing hangs in the sky:
the sun or the moon. One blood-red key sits in the thumb zone — **TRIGGER** —
and pressing it scrambles the tablet's glyphs into a fun conspiracy fact
about whatever is above.

*As above, so below* — the Emerald Tablet's own line. The SKY toggle
literally chooses what is above.

Everything on stage is always slightly in motion — the tablet levitates, the
glow breathes, dust rises, the halo swells — and nothing ever lurches: every
animation is interruptible mid-flight. Mash the key, flip the sky mid-swap;
the scene stays liquid. The altar is the only still thing on stage.

## The corpus

Every fact is a real, documented conspiracy theory or fringe belief —
Herschel's inhabited sun (1795), the Spaceship Moon (Sputnik, 1970), the
hollow-moon "rang like a bell" quote (Apollo 12, 1969), the sun simulator,
planet Clarion parked behind the moon — told as camp, never asserted as
true. The `filed under:` footer on every fact names who proposed it, when,
and its actual status. All attributions were verified at authoring time;
anything unconfirmable was cut.

No AI, no server, no accounts, no persistence. The corpus is baked in and
every press answers instantly.

## Run it

Node 20+ (`.nvmrc` pins it).

```bash
npm install
npm run dev        # http://localhost:3000
```

## Controls

- **The red key** (or **Enter** / **Space** anywhere, or tapping the tablet)
  — the tablet answers.
- **S** — flip the sky (sun ⇄ moon: body, palette, and corpus all swap).
- **console** (chip, bottom right) — SKY · SUN/MOON, MOTION · LIVE/STILL,
  ORACLE · AUTO/OFF (left alone for ~45s, the tablet re-decodes on its own).

Honors `prefers-reduced-motion`: ambient life goes still, the decode becomes
a crossfade, the sky swap becomes a fade — nothing is lost but the physics.

## Verify

```bash
npm test               # corpus integrity, picker law, decode math, state
npm run test:e2e       # Playwright smoke (trigger loop, drawer, overflow, a11y paths)
node scripts/peek.mjs          # frame-captures the choreography (dev server up)
node scripts/peek-reduced.mjs  # the reduced-motion contract, framed
```
