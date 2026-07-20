# AS ABOVE

A small, motion-saturated devotional scene. One thing hangs in the sky — the
sun a pure luminous disc, the moon a bare pearl veiled in drifting fog — and
its color radiates outward as a field of slow, organic waves that fill the
whole viewport in pastel-psychedelic shades. Before it floats the Emerald
Tablet: a rounded, perfectly symmetric slab of deep emerald, its top bevel
catching the sky, its pale-jade lettering engraved into the stone. In the
thumb zone, the app's hero control: a wide pill of clear LIQUID glass —
deliberately the only unthemed object on stage, the scene visible through
it, refraction pooling at its rim — carrying the nested pyramid of the
Emerald Tablet's cover instead of a label. Pressing it scrambles the
tablet's glyphs into a fun conspiracy fact about whatever is above.

*As above, so below* — the Emerald Tablet's own line. The SKY toggle
literally chooses what is above.

Everything breathes together: the tablet levitates — always plumb — while a
specular gleam wanders its face, wave crests travel outward forever, and a
press launches a ripple FROM THE KEY that races up through the whole field,
heaving each wave ring as its front crosses it, until it reaches the body
above and the halo flares with a slow wheel of rays — below answering above
as one gesture. The tablet takes the weight of its new words and their
engraving surges with light. Nothing ever lurches — every motion is
interruptible mid-flight. Mash the key, flip the sky mid-swap (the swap's
ripple radiates from the body instead); the world stays liquid.

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

- **The glass key** (or **Enter** / **Space** anywhere, or tapping the
  tablet) — the tablet answers.
- **S** — flip the sky (sun ⇄ moon: body, wave palette, earth, and corpus
  all swap).
- **console** (chip, bottom right) — SKY · SUN/MOON, MOTION · LIVE/STILL,
  ORACLE · AUTO/OFF (left alone for ~45s, the tablet re-decodes on its own).

Honors `prefers-reduced-motion`: the field goes still, the decode becomes a
crossfade, the sky swap becomes a fade — nothing is lost but the physics.

## Verify

```bash
npm test               # corpus integrity, picker law, decode math, state
npm run test:e2e       # Playwright smoke (trigger loop, drawer, overflow, a11y paths)
node scripts/peek.mjs          # frame-captures the choreography (dev server up)
node scripts/peek-reduced.mjs  # the reduced-motion contract, framed
```
