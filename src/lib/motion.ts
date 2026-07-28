import type { Transition } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// Motion identity — the vocabulary for everything OUTSIDE the rAF engine:
// Motion-driven springs for the console drawer, the keycap settle, and the
// screen's FLIP growth. Components consume these tokens; raw literals live
// only here (engine numbers live in lib/tablet.ts TABLET).
//
// Personality: liquid and ceremonial — calm springs, nothing restarts from
// zero, and overshoot is rationed to exactly one voice: the TRIGGER keycap's
// release settle. Everything else eases to rest.
// ─────────────────────────────────────────────────────────────────────────────

/** The drawer: decisive, no bounce (HATCH's thumb-first pattern). */
export const PANEL_SPRING: Transition = { type: 'spring', stiffness: 380, damping: 36 };

/** How much stage the mobile drawer reveal yields, in px. */
export const PANEL_HEIGHT_MOBILE = 240;

/** The keycap's release — the one rationed bounce on stage. */
export const KEY_RELEASE: Transition = { type: 'spring', stiffness: 540, damping: 15 };

/** The screen growing to fit a longer fact (FLIP height retarget). Soft on
    purpose — the slab breathes to its new size, it never pops. A GROW is
    measured at fire and LAUNCHES at the gulp's release (the delay is
    passed per-fire) — the stone inhales with the sea, then expands the
    instant the ripple is born above, still ahead of the write edge. A
    SHRINK waits for the settle (the outgoing text still stands on the
    lower stone) and exhales once the words land; the engine's breath sigh
    dips the slab just under final size so even a shrink ends expanding. */
export const GROW: Transition = { type: 'spring', stiffness: 90, damping: 20 };

/** One press language for every console pressable (control voice only —
    the TRIGGER key has real key physics instead of a scale token). */
export const PRESS = { whileTap: { scale: 0.95 } } as const;

/** Reduced-motion path: short opacity-only moves. */
export const REDUCED_FADE_MS = 140;

/** THE POSTER's ink — the shared species-eval/HATCH treatment: giant
    variable type ENTERS THIN AND GROWS on a near-critically-damped spring
    (ζ≈0.91 — the axis clamps at 900, so real overshoot would flat-line
    there and read as a stall). Fraunces opens at its axis floor (100,
    genuinely hairline — HATCH's lesson: starting at the minimum is what
    makes "thin" read) and lands at full black. The weight settles AFTER
    the drift/fade — the late channel is the follow-through. */
export const POSTER_INK_FROM = 100;
export const POSTER_INK_REST = 900;
export const POSTER_INK: Transition = { type: 'spring', stiffness: 120, damping: 20 };
/** The lines' drift into place — calm, no bounce (the poster is paper,
    not water). */
export const POSTER_GLIDE: Transition = { type: 'spring', stiffness: 300, damping: 30 };
/** AS leads, ABOVE follows one breath later (dramatic-stagger register). */
export const POSTER_LINE_STAGGER_MS = 150;
