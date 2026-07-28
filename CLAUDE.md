# CLAUDE.md

## Project
AS ABOVE — a motion-saturated single-scene web app: a rounded emerald slab
floats before the sun or moon, whose color radiates across the whole
viewport as a field of traveling waves; a liquid-glass key (the app's hero
control) magically re-engraves the tablet with verified conspiracy
lore about whatever is above. Human-facing overview and controls live in
`README.md`.

## Commands
- Use Node 20+ and npm 9+ (`.nvmrc` pins Node 20; npm scripts preflight —
  this dev box runs 20.5.1, so the stack stays on Next 15: Next 16 needs ≥20.9).
- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (type-checks) · `npm run start` — serve it
- `npm run lint` — ESLint · `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest (corpus integrity, picker law, engrave math, oracle state)
- `npm run test:e2e` — Playwright smoke on port 3111 (trigger loop, drawer +
  sky swap, 375px overflow, keyboard-only path, STILL, reduced motion)
- Verifying motion: `node scripts/peek.mjs [outdir]` (idle/engrave/mash/swap/
  reversal/drawer beats), `node scripts/peek-engrave.mjs [outdir]` (a dense
  frame burst across one full engrave cycle), and
  `node scripts/peek-reduced.mjs` — Playwright frame captures against the
  running dev server. Never sign off choreography from code alone.
- Slow motion for the eye: bump `SLOWMO` in `src/lib/slowmo.ts` (HMR applies
  live; 6 ≈ a ~4s cascade) — one dial stretches the whole fire (rAF engine
  via a virtual clock, the FLIP via `slow()`, ms beats via `slowMs()`)
  with spring character preserved. CSS-owned motion (theme glide, decode
  warm/cool, ambient, drawer) stays realtime. RESET TO 1 before commit.

## Stack
- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Motion
  (motion.dev) · npm. Client-only: **no API routes, no provider seam, no
  persistence** — the corpus is static and the pick is local.

## The philosophy: motion spread, not spent
HATCH banked its drama budget for two poles. AS ABOVE spreads it as
continuous liquid motion through everything, all the time. The rules:
- **Ranking law:** every ambient amplitude is smaller AND slower than any
  user-caused motion (bob 7px/6.2s vs fire dip ~13px impulse; wave crests
  drift on an ~8.8s cycle vs the ripple front crossing in ~2.2s). Ambient
  sines use incommensurate periods so nothing visibly syncs. The earth
  (dunes) is RETIRED from the stage for now — `Dunes.tsx`, its CSS, and the
  `--dune-*` tokens remain for a possible return, but nothing renders it;
  the wave field runs to the floor and the key is the stage's anchor.
- **Symmetry law:** the tablet is always plumb — the float is a pure
  vertical bob (no sway, no tilt), the slab and its lighting are mirror-
  symmetric, and the sheen is a small wander that must never park on a rail
  and fake a side-light.
- **Coherence spine:** ONE swell state drives the gem's glow surge and the
  wave field's amplitude, and every fire speaks one grammar: the sea GULPS
  (every ring pulls inward for one ~320ms breath) — and the STONE INHALES
  WITH IT (the breath: a centered, narrower-dominant squeeze on the same
  gulp clock, so the slab always dips below its final size) — and on the
  release a ripple is born FROM THE BODY (sun or moon) — halo + ray bloom
  FLARE at that birth, not at the press — cascading outward with the waves
  only as far as the TERMINAL ring (the ring NEAREST THE KEY, measured per
  fire), kicking and washing each ring it crosses, and LANDING on the
  terminal ring — the light dies fast there (a flash that cascades and
  lands) while the water keeps moving: a springy touchdown thump and its
  after-thump ringing down to still — while the tablet dips, its
  engraving lights, and its FLIP growth launches at that same release —
  above answers below, and the answer lands where the hand is.
- **Interruptible by construction:** interactive motion is springs (retarget
  keeps velocity) and the engrave is a pure function of (plan, t) whose only
  state is its two edges — a retrigger re-plans from the current frame (an
  early pass keeps erasing from the same edge; a late one promotes the
  half-written fact to outgoing), so the light never snaps. Wave crest
  travel is a phase-lagged radial oscillation — no respawn seam to glitch.
  TRIGGER-mashing and mid-swap reversal are e2e-tested.

## Architecture & key decisions
- **One rAF engine** (`AsAboveApp`) writes every animated attribute straight
  to refs — no per-frame React. Channel ownership is strict, one writer per
  element:
  `.tablet-drift` (float: vertical bob only) → `.tablet-dip` (fire dip
  spring + the breath's gulp squeeze: a centered, narrower-dominant scale
  chasing the sea's gulp envelope — transform-only, since real width would
  reflow the monospace wrap and real height would clip the standing
  outgoing text) → gem; `.tablet-aura` (glow breath + swell) · `.tablet-sheen`
  (specular wander on its own period) · sky drift g → sun/moon g's (swap
  pose + opacity) · halos (per-body breath + ripple flare) · `.sky-rays`
  (flare opacity + slow wheel) · one scale per wave-ring group (crest
  travel + ripple kick) + one opacity per wash twin (the ripple's light
  sweeping the rings; fronts are pooled ×3, pure math) · the key's lens copy
  (every ring/ripple write mirrored into the windowed field inside the
  glass) · `.tablet-text` (the engrave's `--edge-in`/`--edge-out`/
  `--cap-out`/`--lit` vars — mask shapes live in CSS) · the four text
  layers (outgoing + incoming, each carved + gold twin; `textContent`
  written per pair, only at fire).
  Motion (the library) owns exactly two elements: the stage slide (drawer)
  and the face's FLIP height; CSS owns seeded ambient dressing (motes,
  stars, mist, glyph flutter, gem inclusions, moon fog veils), gated on
  BOTH `[data-motion='live']` and `prefers-reduced-motion`.
- **`TABLET` config** (`src/lib/tablet.ts`) holds every tunable — float,
  dip, glow, swap, halos, waves (ring count/radii/wobble/travel + the
  ripple: speed/scales/kick/flare/rays), sheen, engrave sweep timings,
  oracle idle — plus `TABLET.alive = false`, the one-line kill-switch (facts
  still deal; motion stops). The console's MOTION chip ANDs with it at
  runtime.
- **The ripple** originates at the body: `firePulse()` claims a pool slot,
  measures the TERMINAL ring (the ring radius NEAREST `.key-zone`'s center,
  mapped into wave-svg units once per fire — the key is fixed in the
  layout, so the journey is constant; anchoring to the tablet made it jump
  with each fact's height), and starts the gulp clock; the pulse waits out `gulp.ms × launchFrac`, then `flare = 1` fires
  at BIRTH (halo boost + `.sky-rays` bloom decay from there). The front
  itself is UNSEEN math on a sine ease from the body to REST on the
  terminal ring: one kernel per frame accumulates each ring's KICK (radial
  heave) and WASH (opacity of a `--pulse`-filled twin path riding in the
  ring's group) as the front crosses its radius, inner to outer, with
  flight energy `1−0.35q` — front-loaded, the body SENDS — and at q=1 the
  kernel PARKS on the terminal ring for the DWELL (`pulse.dwell`), where
  light and water part ways: the LIGHT dies on ONE ease-out clock that
  OPENS `lightLeadMs` before geometric arrival (q-time, which never
  stalls — keyed to q=1 the sine glide parked the glow ~90ms and it read
  as waiting for the thump) and runs `lightMs` past it, its kernel WIDTH
  collapsing to the terminal ring on that same clock — neighbors
  extinguish in sequence and the shockwave dims WHILE it lands (a
  fixed-width fade froze the lit band ~100ms then dimmed it in sync —
  read as "jumps to gone"; a lingering glow ember was also tried and
  cut), while the
  MOVEMENT rings down over the full `dwell.ms` (~850ms) — kick relaxation
  plus a damped-sine touchdown THUMP (heave, slosh back, fainter
  after-thump) on the kick channel. A fire's energy is spent where it
  lands, never switched off (a `(1−q⁵)` extinguish-at-arrival was tried:
  the cascade died the frame it landed and read as anticlimax) — the
  shock is the sea lighting up,
  never a shape drawn over it. A slot is idle only once q ≥ 1 AND its
  dwell is spent (d ≥ 1) — a mash that outruns the pool steals slot 0,
  cutting its ember (same rule as before, just ~850ms stickier). Wash twins own fill in CSS (theme glide);
  the engine writes opacity only, and only on real change. The gulp is a
  constant-u inward half-sine on every ring, applied in the crest sum.
- **The wave field** (`src/components/Waves.tsx`): 9 seeded wobble-edged
  blob rings centered on the body, spanning svg-space 150→585 units where
  600u ↔ `--wave-size`/2 (twice the center-to-farthest-corner distance, via
  CSS `hypot`). Fills are flat, unfiltered, element-scoped
  `color-mix(var(--wave-root) X%, var(--wave-edge))` — the full-viewport SVG
  repaints every frame and holds 60fps (~16.7ms avg measured; keep it flat).
  Crest travel: ring i scales by `1 + (amp/R_i)·sin(2πt/T − i·Δφ)` —
  constant-px crests traveling outward forever.
- **The magical engraving** (`src/lib/engrave.ts`): pure sweep math — no
  scramble, no noise glyphs; the text is always real and a gold
  writing-light does the work. ONE downward pass (~1.1s), two edges: the
  ERASE edge lifts the outgoing letters away TOP → BOTTOM (they ignite the
  moment before they go) and the WRITE edge follows one breath behind
  (`lagMs` ~130ms), landing the incoming letters as pure gold that cools
  into carved jade. Between the edges travels a thin wake of bare stone —
  the tablet is NEVER blank: the old fact is still leaving the bottom
  while the new one is landing at the top. Both edges ride one
  ease-in-out sine and end together — one gesture. A frame is a pure
  function of (plan, t); the only state is the two edges. A retrigger
  re-plans from the current frame: EARLY in a pass (write edge <
  `PROMOTE_THRESHOLD`) the erase carries straight on from its edge while
  the write restarts at the top; LATE, the half-written fact is PROMOTED
  to the outgoing layer (its written extent frozen as `--cap-out`, so the
  never-written remainder cannot appear) and erased from the top. DOM:
  FOUR aligned layers (outgoing carved + gold twin, incoming carved + gold
  twin — identical typography so all four wrap identically; monospace
  keeps this honest), masked by px gradients driven from four unitless
  vars the engine writes on `.tablet-text`: `--edge-in`, `--edge-out`,
  `--cap-out`, `--lit` (band shimmer ~3Hz; park = 99999 sits every
  gradient off the box, no seam to pop). Both edges map onto ONE shared px
  span (`max(outH, inH) + ramp`) — separate spans let the write edge
  spatially outrun the erase on a short→long fact and land letters on
  un-erased stone; the write band's ghost lead is additionally clamped to
  the erase edge in CSS (`min(edge-in + 42, edge-out)`) — superimposed
  letters were seen and rejected. The gold lives in the LETTERFORM
  (`--letter-lit`) with only a tight halo — wide bright text-shadows fuse
  a monospace word into a pale highlight box (seen, rejected). The face
  fits via a measured FLIP height spring (soft — 90/20): a GROW is
  measured at fire but LAUNCHES at the gulp's release (`gulp.ms ×
  launchFrac`, the ripple's birth — the stone inhales with the sea via the
  breath squeeze, then expands as above answers below), still ahead of
  the write edge; a SHRINK waits (`pendingShrink`) and exhales at the
  settle — shrinking mid-pass would clip the outgoing text still standing
  on the lower stone — answered by the breath's SIGH (a squeeze impulse
  dipping the slab just under final size), so even a shrink ends as an
  expansion. The breath is transform, never layout: an underdamped height
  spring would clip the face's bottom padding and flatten at min-height. The fire
  measures the stone BEFORE writing the new text (a face with no explicit
  height yet — first fire, post-resize — would otherwise measure the new
  content as its start and snap). Its `min-height` (0.47·stage) gives the
  idle gem its portrait stature (glyphs/hint are absolutely placed and
  contribute none). The tablet is CENTER-ANCHORED (top 50%,
  translateY(-50%)): growth breathes symmetrically toward body and key,
  so gaps stay balanced at every fact length.
- **Picker law** (`src/lib/picker.ts`): seeded shuffle bag per body; no
  repeat until the pool exhausts; a fresh bag never opens with the fact
  just shown. `src/lib/state.ts` keeps per-body memory — the sky swap is a
  PURE swap (each body re-speaks its own last fact, or returns to idle
  glyphs), the serial only advances on a real deal.
- **Corpus** (`src/data/facts.ts`): 16 sun + 17 moon, typed with
  `satisfies`. Every `filedUnder` was fetch-verified at authoring
  (person/year/publication); unverifiable or ugly-origin entries were cut.
  The `filed under: … Status: …` footer is mandatory and always rendered —
  integrity tests enforce it. Keep lore ≲420 chars: the longest fact must
  clear the trigger on a 900px stage.
- **Sky swap**: a manual spring on progress 0(sun)…1(moon) drives both
  bodies' pose (`swapPose` — the leaving body sinks as the other rises
  through it); the palette glides via CSS `--theme-fade` transitions on
  token consumers (wave fills included). Reversible at any frame.
- **Console**: HATCH's thumb-first drawer in liquid glass. On ≤640px the
  WHOLE stage slides up (the app is the drawer); desktop gets a rising
  bottom bar. `inert` when closed. Keyboard: Enter/Space fire from anywhere
  (global handler defers to focused interactive elements), S flips the sky,
  Esc closes.
- **data-\* signals on `<main>`** — the e2e/capture handover (never race the
  mount): `data-ready`, `data-mode`, `data-decode` (idle/decoding/settled),
  `data-console`, `data-motion`. `settled` is raised only once the words are
  actually on the glass — including the reduced-motion crossfade path.
- **Reduced motion / STILL**: `inert = reduced || !motionLive || !alive` —
  field still, ambient zeroed, the engrave becomes a crossfade, swap becomes
  a fade, function fully preserved (e2e-covered).

## Design & type
- **Materials**: the gem is mode-shared (deep emerald face inside a
  symmetric rounded slab — `--tablet-radius`, frame as PADDING on
  `.tablet-gem`, a `::before` bevel crown along the top, mirrored inset
  side-lights, slow internal inclusions, a small wandering sheen);
  lettering is ENGRAVED — pale jade (`--letter`, ~10:1 on the face; the
  reality tag ~6:1) with an incised text-shadow. A fire runs the magical
  engraving: the gold writing-light (`--letter-lit` + `--engrave-*` — the
  letterform carries the gold, the halo only hugs it) sweeps the block
  while the whole stone warms a shade (`[data-decode='decoding']`), then
  everything settles back to carved. NO hard edges on
  major elements, NO outlines/surface doodles on the bodies: the sun is a
  flat disc + white-hot core gradient; the moon a bare pearl + limb shading
  + fog veils. The console is themed liquid glass (`--glass-*`); the
  TRIGGER key is the HERO — deliberately UNTHEMED, and REAL liquid glass:
  a wide pill whose enhanced path samples no backdrop at all. It holds a
  pixel-aligned windowed COPY of the wave field (`buildWaveRings(seed)` —
  same seed,
  same geometry; the engine dual-writes every crest scale and ripple
  transform to both trees; `syncLensWindow` aims its viewBox, re-aimed
  after the stage entrance and on resize) and BENDS it with a true
  feDisplacementMap lens (`src/lib/lens.ts`, the glass-demo technique:
  rounded-rect SDF map on canvas, quadrant-mirrored; sRGB
  color-interpolation or 128 isn't neutral; fresh filter id per update or
  Safari serves stale pixels; the filter is NEVER applied before the map
  image has decoded — iOS rasterizes an unloaded feImage as an empty map
  (max displacement) and caches the smear under the current id; map regen
  only on resize, `setStrength` is the cheap path — the press deepens the
  bend). The bend is a PROGRESSIVE ENHANCEMENT: WebKit (Safari anywhere +
  every iOS browser) rasterizes url() SVG filters on HTML content
  unreliably on first paint (half-drawn/empty, re-stamping does not heal
  it), so `lensSupported()` positively allows only Chromium. Until that
  support decision, the duplicate SVG is not mounted at all; the flat path
  never inserts it on WebKit and instead exposes the real field through the
  transparent key. A painted `.key-grade` keeps the glass body.
  `?lens=force` re-enables for device testing. Do NOT trust Playwright
  WebKit for lens work: its port renders NO url() filters at all. Painted layers above the
  bent scene are whispers: `.key-tint` (faint white, never frost) ·
  `.key-rim` (1px UNEVEN vertical-gradient ring via mask-xor — never a
  solid border) · `.key-gloss`/`.key-glint`/`.key-caps` (slim top band,
  bottom pooling, mirrored cap streaks — symmetry law). It carries the
  nested-pyramid emblem, no label (e2e finds it by aria-label /trigger/i).
  Active console chips answer the gem in jade (`--control-active`).
- **Sky tokens**: SUN is the resting read; `[data-mode='moon']` overrides
  (mirrored onto `<html>` so body paint follows). Each mode defines
  `--body-fill/--halo/--wave-root/--wave-edge/--pulse/--ink/--dune-1..3/
  --star`; ring fills interpolate root→edge per ring index. Register:
  pastel-psychedelic — bright, saturated-but-soft, pop without neon (sun
  rides gold→peach→rose→violet; moon pearl→periwinkle→indigo), never
  earthy-muted.
- Two voices: **Cutive Mono** is the tablet voice (tablet text, console
  labels, hints — typewriter-serif that engraves; monospace keeps the
  engrave's two text layers wrapping identically). **Cinzel** is the
  display voice (wordmark only). Swap faces in `layout.tsx` only
  (`--font-terminal` / `--font-display`).
- **`--stage-h`/`--stage-w`/`--wave-size` (globals.css) are the composition
  knobs**: body, tablet, dunes, key, and overlays derive from stage
  fractions, never raw viewport %.

## Gotchas
- Interleaving `next build` and `next dev` on one `.next` corrupts
  `next/font` hashes (fonts silently fall back to system). Fix:
  `rm -rf .next`. Two dev servers on one `.next` can do the same.
- `@theme inline` tokens are not real custom properties — plain CSS must
  reference `--font-terminal`/`--font-display` directly.
- An unregistered custom property resolves its inner `var()`s where it is
  DECLARED — write element-scoped `color-mix(...)` on the element, never
  parameterized at `:root`.
- CSS `pow()`/`sqrt()` take NUMBERS, not lengths — a length-typed distance
  needs `hypot()` (which is how `--wave-size` is computed). An invalid math
  function silently collapses the whole declaration.
- The gem's frame is PADDING on `.tablet-gem`, never a margin on
  `.tablet-face`: a child margin collapses through the parent, and with the
  face's FLIP-set explicit height it silently erases the top/bottom bevel
  bands (the face fills the slab). Hit this once; don't reintroduce it.
- A `z-index: 1` sibling paints over z-auto positioned elements regardless
  of DOM order — the wave field is `z-index: 0` and `.stage` is `1`.
- `setPointerCapture` throws on synthetic pointerIds (tests, capture
  scripts) — the TRIGGER guards it; keep the guard.
- Never animate the key with a to-only transform string: Motion/WAAPI
  mis-reads the "current" transform and tweens up from ~scale(0) — a
  two-frame half-size flash on every press. The key's press/release use
  explicit from→to keyframe pairs (worst interruption snap ~1.5%,
  invisible; the flash was not).
- Playwright's `reducedMotion` context option is not honored by this
  headless profile — specs use `page.emulateMedia({ reducedMotion })`.
- The session seed is minted client-side and the scene renders only after
  boot (fonts ready) — don't move seeded generation into SSR'd render
  paths or hydration will mismatch.

## Layout
- `src/data/` — `facts.ts` (the verified corpus) + `integrity.test.ts`
- `src/lib/` — `tablet` (TABLET config + spring/float/swap math) · `engrave`
  (pure sweep math) · `picker` (shuffle bag) · `state` (oracle reducers) ·
  `rand` (xmur3/mulberry32) · `motion` (Motion-side vocabulary) · `slowmo`
  (the dev slow-motion dial)
- `src/components/` — `AsAboveApp` (orchestrator + THE engine) · `Waves` ·
  `Sky` · `Tablet` · `Dust` · `TriggerKey` · `Console` · `Dunes` (kept but
  currently unmounted — the earth may return)
- `scripts/` — `peek.mjs` · `peek-engrave.mjs` · `peek-reduced.mjs`
  (frame-capture verification)
- `tests/e2e/` — `as-above.spec.mjs`
