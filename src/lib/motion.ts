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

/** The screen growing to fit a longer fact (FLIP height retarget). */
export const GROW: Transition = { type: 'spring', stiffness: 220, damping: 27 };

/** One press language for every console pressable (control voice only —
    the TRIGGER key has real key physics instead of a scale token). */
export const PRESS = { whileTap: { scale: 0.95 } } as const;

/** Reduced-motion path: short opacity-only moves. */
export const REDUCED_FADE_MS = 140;

/** The hint line waits a beat before speaking, and retires after first use. */
export const HINT_AT_MS = 1600;
