# AS ABOVE

A small, motion-saturated devotional scene, set on its own magazine cover:
**AS / ABOVE** in colossal variable serif fills the screen behind
everything, with the sun hanging between the A and the S and the tablet
floating over the word — the scene overlaps its title, poster-style,
always. One thing hangs in the sky — the
sun a pure luminous disc, the moon a bare pearl veiled in drifting fog — and
its color radiates outward as a field of slow, organic waves that fill the
whole viewport in pastel-psychedelic shades. Before it floats the Emerald
Tablet: a rounded, perfectly symmetric slab of deep emerald, its top bevel
catching the sky, its pale-jade lettering engraved into the stone. In the
thumb zone, the app's hero control: a wide pill of dark SMOKED glass in
the sky's deepest tone — the cover's word ghosting through the tinted
pane, a hairline of light along its rim — carrying the nested pyramid of
the Emerald Tablet's cover instead of a label. Pressing it engraves a fun
conspiracy fact about whatever is above: one downward pass of gold
writing-light lifts the old letters away just ahead of landing the new
ones — igniting as pure light, cooling into carved jade — with only a thin
wake of bare stone traveling between the leaving fact and the arriving
one.

*As above, so below* — the Emerald Tablet's own line. The SKY toggle
literally chooses what is above.

Every load opens with the world being born: the sun alone in the dark,
flaring as the sea grows out of it ring by ring; the title arrives hairline
and inks itself black; then the sky fires once on its own — the sea gulps,
a ripple is born at the body, and the tablet condenses out of the light as
the front rolls down — landing on the ring under your thumb, where the
glass key materializes on the touchdown. Input goes live the moment the
key exists. (Under reduced motion the whole opening is one quiet
crossfade.)

Everything breathes together: the tablet levitates — always plumb — while a
specular gleam wanders its face, wave crests travel outward forever, and a
press makes the whole sea GULP — one sharp inward breath — and on the
release the sky answers: the halo flares with a slow wheel of rays and a
ripple is born AT THE BODY, rolling down with the waves, each ring heaving
and washing bright with the body's own light, until it lands on the ring
under your thumb and gives it the last of its glow —
above answering below as one gesture. The tablet takes the weight of its
new words and their engraving surges with light. Nothing ever lurches —
every motion is interruptible mid-flight. Mash the key, flip the sky
mid-swap; the world stays liquid.

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
  ORACLE · AUTO/OFF (left alone for ~45s, the tablet speaks again on its own).

Honors `prefers-reduced-motion`: the field goes still, the engraving becomes
a crossfade, the sky swap becomes a fade — nothing is lost but the physics.

## Verify

```bash
npm test               # corpus integrity, picker law, engrave math, state
npm run test:e2e       # Playwright smoke (trigger loop, drawer, overflow, a11y paths)
node scripts/peek.mjs          # frame-captures the choreography (dev server up)
node scripts/peek-reduced.mjs  # the reduced-motion contract, framed
```
