# CLAUDE.md

## Project
AS ABOVE — a motion-saturated single-scene web app: a cut-gem emerald tablet
floats before the sun or moon, whose color radiates across the whole
viewport as a field of traveling waves; a liquid-glass TRIGGER key scrambles
the tablet's engraved glyphs into verified conspiracy lore about whatever is
above. Human-facing overview and controls live in `README.md`.

## Commands
- Use Node 20+ and npm 9+ (`.nvmrc` pins Node 20; npm scripts preflight —
  this dev box runs 20.5.1, so the stack stays on Next 15: Next 16 needs ≥20.9).
- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build (type-checks) · `npm run start` — serve it
- `npm run lint` — ESLint · `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest (corpus integrity, picker law, decode math, oracle state)
- `npm run test:e2e` — Playwright smoke on port 3111 (trigger loop, drawer +
  sky swap, 375px overflow, keyboard-only path, STILL, reduced motion)
- Verifying motion: `node scripts/peek.mjs [outdir]` (idle/decode/mash/swap/
  reversal/drawer beats) and `node scripts/peek-reduced.mjs` — Playwright
  frame captures against the running dev server. Never sign off choreography
  from code alone.

## Stack
- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Motion
  (motion.dev) · npm. Client-only: **no API routes, no provider seam, no
  persistence** — the corpus is static and the pick is local.

## The philosophy: motion spread, not spent
HATCH banked its drama budget for two poles. AS ABOVE spreads it as
continuous liquid motion through everything, all the time. The rules:
- **Ranking law:** every ambient amplitude is smaller AND slower than any
  user-caused motion (bob 7px/6.2s vs decode dip ~13px impulse; wave crests
  drift on an ~8.8s cycle vs the press pulse crossing in ~1.7s). Ambient
  sines use incommensurate periods so nothing visibly syncs. The earth
  (dunes) is the one still anchor.
- **Coherence spine:** ONE swell state drives the gem's glow surge and the
  wave field's amplitude, and every fire (key, tablet tap, keyboard, oracle,
  sky swap) launches a pulse ring racing through the field while the tablet
  dips and its engraving lights — press, rays, and tablet answer as one
  gesture.
- **Interruptible by construction:** interactive motion is springs (retarget
  keeps velocity) and the decode is a pure function of (plan, t) with no
  accumulated state — a retrigger plans toward the new text and the boiling
  frame is simply its starting field. Wave crest travel is a phase-lagged
  radial oscillation — no respawn seam to glitch. TRIGGER-mashing and
  mid-swap reversal are e2e-tested.

## Architecture & key decisions
- **One rAF engine** (`AsAboveApp`) writes every animated attribute straight
  to refs — no per-frame React. Channel ownership is strict, one writer per
  element:
  `.tablet-drift` (float) → `.tablet-dip` (decode dip spring) → gem;
  `.tablet-aura` (glow breath + swell) · `.tablet-sheen` (specular slide,
  rides the float tilt) · sky drift g → sun/moon g's (swap pose + opacity) ·
  halos (per-body breath) · one scale per wave ring (crest travel) · pulse
  rings (pool of 3) · the three text blocks (decode `textContent`, written
  only on churn change).
  Motion (the library) owns exactly two elements: the stage slide (drawer)
  and the face's FLIP height; CSS owns seeded ambient dressing (motes,
  stars, mist, glyph flutter, gem inclusions), gated on BOTH
  `[data-motion='live']` and `prefers-reduced-motion`.
- **`TABLET` config** (`src/lib/tablet.ts`) holds every tunable — float,
  dip, glow, swap, halos, waves (ring count/radii/wobble/travel/pulse),
  sheen, decode cadence, oracle idle — plus `TABLET.alive = false`, the
  one-line kill-switch (facts still deal; motion stops). The console's
  MOTION chip ANDs with it at runtime.
- **The wave field** (`src/components/Waves.tsx`): 9 seeded wobble-edged
  blob rings centered on the body, spanning svg-space 150→585 units where
  600u ↔ `--wave-size`/2 (twice the center-to-farthest-corner distance, via
  CSS `hypot`). Fills are flat, unfiltered, element-scoped
  `color-mix(var(--wave-root) X%, var(--wave-edge))` — the full-viewport SVG
  repaints every frame and holds 60fps (~16.7ms avg measured; keep it flat).
  Crest travel: ring i scales by `1 + (amp/R_i)·sin(2πt/T − i·Δφ)` —
  constant-px crests traveling outward forever.
- **Decode as pure text math** (`src/lib/decode.ts`): per-cell resolve
  schedule (reading-order cascade, ≤900ms hard ceiling), deterministic
  noise per (cell, churn-tick), spaces pre-resolved so monospace word-wrap
  never jumps mid-boil. The face grows to fit via a measured FLIP height
  spring — never scrolls; its `min-height` gives the idle gem its portrait
  stature (glyphs/hint are absolutely placed and contribute none).
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
  field still, ambient zeroed, decode becomes a crossfade, swap becomes a
  fade, function fully preserved (e2e-covered).

## Design & type
- **Materials**: the gem is mode-shared (deep emerald face, chamfered
  seeded clip-path silhouette, bevel band, slow internal inclusions, a
  sheen that rides the float tilt); lettering is ENGRAVED — pale jade
  (`--letter`, ~10:1 on the face; the reality tag ~6:1) with an incised
  text-shadow, lifting to luminous during `[data-decode='decoding']` and
  settling back to carved. Controls are liquid glass (`--glass-*`);
  active console chips answer the gem in jade (`--control-active`).
- **Sky tokens**: SUN is the resting read; `[data-mode='moon']` overrides
  (mirrored onto `<html>` so body paint follows). Each mode defines
  `--body-fill/--halo/--wave-root/--wave-edge/--pulse/--ink/--dune-1..3/
  --star`; ring fills interpolate root→edge per ring index.
- Two voices: **Cutive Mono** is the tablet voice (tablet text, console
  labels, hints — typewriter-serif that engraves; monospace is load-bearing
  for the decode). **Cinzel** is the display voice (wordmark only). Swap
  faces in `layout.tsx` only (`--font-terminal` / `--font-display`).
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
- `clip-path` clips the element's own `filter: drop-shadow` output — depth
  shadows live on the un-clipped parent (`.tablet-slab`), which shadows the
  child's clipped silhouette.
- A `z-index: 1` sibling paints over z-auto positioned elements regardless
  of DOM order — the wave field is `z-index: 0` and `.stage` is `1`.
- `setPointerCapture` throws on synthetic pointerIds (tests, capture
  scripts) — the TRIGGER guards it; keep the guard.
- Playwright's `reducedMotion` context option is not honored by this
  headless profile — specs use `page.emulateMedia({ reducedMotion })`.
- The session seed is minted client-side and the scene renders only after
  boot (fonts ready) — don't move seeded generation into SSR'd render
  paths or hydration will mismatch.

## Layout
- `src/data/` — `facts.ts` (the verified corpus) + `integrity.test.ts`
- `src/lib/` — `tablet` (TABLET config + spring/float/swap math) · `decode`
  (pure scramble) · `picker` (shuffle bag) · `state` (oracle reducers) ·
  `rand` (xmur3/mulberry32) · `motion` (Motion-side vocabulary)
- `src/components/` — `AsAboveApp` (orchestrator + THE engine) · `Waves` ·
  `Sky` · `Dunes` · `Tablet` · `Dust` · `TriggerKey` · `Console`
- `scripts/` — `peek.mjs` · `peek-reduced.mjs` (frame-capture verification)
- `tests/e2e/` — `as-above.spec.mjs`
