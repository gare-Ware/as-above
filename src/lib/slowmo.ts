import type { Transition } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only slow motion for eyeballing choreography (species-eval's dial,
// adapted to this app's time architecture). SLOWMO = 1 is OFF — every hook
// is a no-op / identity. Bump it (HMR applies live) to stretch the whole
// fire in time while preserving its shape, then RESET TO 1 before
// committing. The hooks are harmless at 1, so they stay wired.
//
// What the dial covers — the three time domains of a fire:
//   · the rAF engine (AsAboveApp): its dt and virtual clock (st.vnow) are
//     divided by SLOWMO, which stretches EVERYTHING the engine owns —
//     gulp, ripple flight + landing, springs, flare, engrave sweep, float,
//     sheen — with spring character preserved (springs integrate dt, so
//     scaling dt scales time without touching their damping ratio)
//   · Motion transitions (the FLIP growth): wrap with slow() — springs are
//     scaled stiffness/k², damping/k so the damping ratio (overshoot /
//     settle character) is unchanged, tweens/delays multiply directly
//   · setTimeout beats (choreography held in plain ms): wrap with slowMs()
//
// NOT covered (stays realtime, by design): CSS-owned motion — the theme
// glide, the [data-decode] warm/cool, ambient dressing (motes, stars,
// mist), the console drawer, and the key's press physics. The dial is a
// fire-choreography lens, not a global freeze.
// ─────────────────────────────────────────────────────────────────────────────
export const SLOWMO: number = 1; // 1 = real time · 6 ≈ a ~4s cascade for analysis

const TIME_KEYS = new Set(['duration', 'delay', 'delayChildren', 'staggerChildren', 'repeatDelay']);

function scale(value: unknown, k: number): unknown {
  if (Array.isArray(value)) return value.map((v) => scale(v, k));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (typeof v === 'number') {
        // Stretch time by k. For springs, stiffness/k² + damping/k keeps the
        // damping ratio constant, so the curve is identical — just k× slower.
        if (TIME_KEYS.has(key)) out[key] = v * k;
        else if (key === 'stiffness') out[key] = v / (k * k);
        else if (key === 'damping') out[key] = v / k;
        else out[key] = v;
      } else {
        out[key] = scale(v, k); // recurse into nested per-value transitions
      }
    }
    return out;
  }
  return value;
}

/** Wrap a Motion transition so it stretches with the dial. */
export function slow(transition: Transition): Transition {
  return SLOWMO === 1 ? transition : (scale(transition, SLOWMO) as Transition);
}

/** Wrap a raw millisecond beat (setTimeout choreography) likewise. */
export function slowMs(ms: number): number {
  return ms * SLOWMO;
}
