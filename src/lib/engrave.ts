// engrave.ts — the magical engraving as pure sweep math, no DOM. One
// downward pass, two edges: the ERASE edge lifts the old letters away
// TOP → BOTTOM, and the WRITE edge follows one breath behind (lagMs),
// engraving the new fact into the freshly bared stone. Between them travels
// a thin wake of bare rock — the light's wake — so the tablet is never
// blank: the old copy is still leaving the bottom while the new copy is
// already landing at the top. Both edges ride the same easing and end
// together — one gesture, one moment.
//
// Interruptible by construction: a frame is a pure function of (plan, t)
// and the only state is the two edges. A retrigger re-plans from the
// current frame: early in a pass the erase simply CONTINUES from its
// current edge (eraseFrom) while the write restarts at the top; late in a
// pass the half-written fact is promoted to the outgoing layer and erased
// from the top (the engine freezes its written extent as a cap). The
// PROMOTE_THRESHOLD on the write edge picks the branch that pops the
// smaller region.
//
// Edges are normalized 0..1 over each layer's own span. The OUTGOING text
// is visible BELOW the erase edge; the INCOMING text is visible ABOVE the
// write edge. The DOM mapping (px masks, the two gold bands, the cap)
// lives in globals.css; the engine only writes edges.

export interface EngraveOpts {
  /** One full edge sweep, top to bottom. Both edges use this duration. */
  passMs: number;
  /** How far the write edge trails the erase edge — the wake's breadth. */
  lagMs: number;
}

export const ENGRAVE_DEFAULTS: EngraveOpts = {
  passMs: 950,
  lagMs: 130,
};

/** Retrigger mid-pass: below this write-edge progress the erase continues
    and the write restarts (the few written lines re-ignite as the new
    fact); above it the half-written fact is promoted to outgoing. Either
    way the region that snaps is the minor one. */
export const PROMOTE_THRESHOLD = 0.45;

export interface EngravePlan {
  outTexts: readonly string[];
  inTexts: readonly string[];
  /** Where the erase resumes (0..1) — 0 fresh, the current erase edge when
      a retrigger interrupts an early pass. */
  eraseFrom: number;
  /** False when the stone was bare (first fire, idle glyphs): no erase, no
      lag — the light starts writing immediately. */
  hasOut: boolean;
  passMs: number;
  lagMs: number;
  totalMs: number;
}

export interface EngraveFrame {
  phase: 'sweep' | 'settled';
  /** The erase edge, 0..1 — outgoing text is visible BELOW it. */
  eraseE: number;
  /** The write edge, 0..1 — incoming text is visible ABOVE it. */
  writeE: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Ease-in-out sine: the light gathers at the top, sweeps, and decelerates
    into the landing. Zero velocity at both ends — no snap at either. */
const ease = (p: number) => 0.5 * (1 - Math.cos(Math.PI * p));

/** Plan an engraving from what is on the stone toward the new texts. */
export function planEngrave(
  outTexts: readonly string[],
  inTexts: readonly string[],
  eraseFrom: number,
  opts: EngraveOpts = ENGRAVE_DEFAULTS,
): EngravePlan {
  const hasOut = outTexts.some((t) => t.length > 0);
  const lagMs = hasOut ? opts.lagMs : 0;
  return {
    outTexts,
    inTexts,
    eraseFrom: hasOut ? clamp01(eraseFrom) : 0,
    hasOut,
    passMs: opts.passMs,
    lagMs,
    totalMs: lagMs + opts.passMs,
  };
}

/** The engraving at time t since the plan's start — pure, no state. */
export function engraveFrame(plan: EngravePlan, tMs: number): EngraveFrame {
  if (tMs >= plan.totalMs) return { phase: 'settled', eraseE: 1, writeE: 1 };
  const eraseE = plan.hasOut
    ? plan.eraseFrom + (1 - plan.eraseFrom) * ease(clamp01(tMs / plan.passMs))
    : 1;
  const writeE = ease(clamp01((tMs - plan.lagMs) / plan.passMs));
  return { phase: 'sweep', eraseE, writeE };
}

export function isSettled(plan: EngravePlan, tMs: number): boolean {
  return tMs >= plan.totalMs;
}
