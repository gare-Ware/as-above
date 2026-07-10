# CLAUDE.md

## Project
AS ABOVE — a motion-saturated single-scene web app: an emerald phosphor
tablet floats over an earthen altar under the sun or moon; the TRIGGER key
scrambles its glyphs into verified conspiracy lore about whatever is above.
Human-facing overview and controls live in `README.md`.

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
HATCH banked its drama budget and spent it at two poles. AS ABOVE is the
opposite experiment: no crescendo anywhere — the budget is spread as
continuous liquid motion through everything, all the time. The rules that
make it work:
- **Ranking law:** every ambient amplitude is smaller AND slower than any
  user-caused motion (bob 7px/6.2s vs decode dip ~13px impulse; drift 2.6px/
  30s vs swap 1.2s). Ambient sines use incommensurate periods so nothing
  ever visibly syncs. The altar is the one still anchor.
- **Interruptible by construction:** interactive motion is springs (retarget
  keeps velocity) and the decode is a pure function of (plan, t) with no
  accumulated state — a retrigger plans toward the new text and the boiling
  frame is simply its starting field. Nothing restarts from zero; the app is
  never "busy". TRIGGER-mashing and mid-swap reversal are e2e-tested.

## Architecture & key decisions
- **One rAF engine** (`AsAboveApp`) writes every animated attribute straight
  to refs — no per-frame React. Channel ownership is strict, one writer per
  element:
  `.tablet-drift` (float) → `.tablet-dip` (decode dip spring) → slab;
  `.tablet-aura` (glow breath + swell) · sky drift g → sun/moon g's
  (swap pose + opacity) · halos (per-body breath) · altar hover-shadow ·
  the three text blocks (decode `textContent`, written only on churn change).
  Motion (the library) owns exactly two elements: the stage slide (drawer)
  and the screen's FLIP height; CSS owns seeded ambient dressing (motes,
  stars, mist, glyph flutter), gated on BOTH `[data-motion='live']` and
  `prefers-reduced-motion`.
- **`TABLET` config** (`src/lib/tablet.ts`) holds every tunable — float,
  dip, glow, swap, halos, decode cadence, oracle idle — plus
  `TABLET.alive = false`, the one-line kill-switch (facts still deal; motion
  stops). The console's MOTION chip ANDs with it at runtime.
- **Decode as pure text math** (`src/lib/decode.ts`): per-cell resolve
  schedule (reading-order cascade, ≤900ms hard ceiling), deterministic
  noise per (cell, churn-tick) so unresolved cells boil at ~18Hz not 60,
  spaces pre-resolved so monospace word-wrap never jumps mid-boil. The
  tablet grows to fit via a measured FLIP height spring — never scrolls.
- **Picker law** (`src/lib/picker.ts`): seeded shuffle bag per body; no
  repeat until the pool exhausts; a fresh bag never opens with the fact
  just shown. `src/lib/state.ts` keeps per-body memory — the sky swap is a
  PURE swap (each body re-speaks its own last fact, or returns to idle
  glyphs), the serial only advances on a real deal.
- **Corpus** (`src/data/facts.ts`): 16 sun + 17 moon, typed with
  `satisfies`. Every `filedUnder` was fetch-verified at authoring
  (person/year/publication); unverifiable or ugly-origin entries were cut
  (no Icke, no Hörbiger, no targeting, no tragedy, no medical). The
  `filed under: … Status: …` footer is mandatory and always rendered —
  integrity tests enforce it.
- **Sky swap**: a manual spring on progress 0(sun)…1(moon) drives both
  bodies' pose (`swapPose` — the leaving body sinks as the other rises
  through it); the palette glides via CSS `--theme-fade` transitions on
  token consumers. Reversible at any frame with preserved velocity.
- **Console**: HATCH's thumb-first drawer, styled as the terminal's bone
  keyboard. On ≤640px the WHOLE stage slides up (the app is the drawer);
  desktop gets a rising bottom bar. `inert` when closed (no hidden tab
  stops). Keyboard: Enter/Space fire from anywhere (global handler defers
  to focused interactive elements), S flips the sky, Esc closes.
- **data-\* signals on `<main>`** — the e2e/capture handover (never race the
  mount): `data-ready`, `data-mode`, `data-decode` (idle/decoding/settled),
  `data-console`, `data-motion`. `settled` is raised only once the words are
  actually on the glass — including the reduced-motion crossfade path.
  There is no readiness clock, so no `?fast` hook exists or is needed.
- **Reduced motion / STILL**: `inert = reduced || !motionLive || !alive` —
  ambient zeroed, decode becomes a crossfade, swap becomes a fade, function
  fully preserved (e2e-covered).

## Theming & type
- Base palette + materials live only in `globals.css`; SUN is the resting
  read of the semantic tokens and `[data-mode='moon']` overrides them — the
  HATCH domain-takeover pattern promoted to a first-class, ever-reversible
  mode switch. The mode attribute is mirrored onto `<html>` (an effect) so
  body paint and overscroll fills follow the sky; `<main>` carries it too
  for tests and scoped CSS.
- Backdrop skies are two stacked fixed-gradient layers crossfading by
  opacity — gradients can't tween through custom-property transitions.
- Two voices: **VT323** is the terminal/phosphor voice (tablet text, console
  labels, hints, reality tags); **Cinzel** is the display voice (the AS
  ABOVE wordmark only). Swap faces in `layout.tsx` only
  (`--font-terminal` / `--font-display`).
- **`--stage-h`/`--stage-w` (globals.css) are the composition's only scale
  knobs**: sky, tablet, altar, key, hint, and every overlay derive from
  them. Position new elements off stage fractions, never raw viewport %.

## Gotchas
- Interleaving `next build` and `next dev` on one `.next` corrupts
  `next/font` hashes (fonts silently fall back to system). Fix:
  `rm -rf .next`. Two dev servers on one `.next` can do the same — stop one.
- `@theme inline` tokens are not real custom properties — plain CSS must
  reference `--font-terminal`/`--font-display` directly or silently fall
  back to system faces.
- An unregistered custom property resolves its inner `var()`s where it is
  DECLARED — write element-scoped `color-mix(...)` values on the element
  (as done throughout), never parameterized at `:root`.
- `setPointerCapture` throws on synthetic pointerIds (tests, capture
  scripts) — the TRIGGER guards it; keep the guard.
- Playwright's `reducedMotion` context option is not honored by this
  headless profile — specs use `page.emulateMedia({ reducedMotion })`
  instead (see the reduced-motion spec).
- The session seed is minted client-side and the scene renders only after
  boot (fonts ready) — don't move seeded generation into SSR'd render
  paths or hydration will mismatch.

## Layout
- `src/data/` — `facts.ts` (the verified corpus) + `integrity.test.ts`
- `src/lib/` — `tablet` (TABLET config + spring/float/swap math) · `decode`
  (pure scramble) · `picker` (shuffle bag) · `state` (oracle reducers) ·
  `rand` (xmur3/mulberry32) · `motion` (Motion-side vocabulary)
- `src/components/` — `AsAboveApp` (orchestrator + THE engine) · `Tablet` ·
  `Sky` · `Altar` · `Dust` · `TriggerKey` · `Console`
- `scripts/` — `peek.mjs` · `peek-reduced.mjs` (frame-capture verification)
- `tests/e2e/` — `as-above.spec.mjs`
