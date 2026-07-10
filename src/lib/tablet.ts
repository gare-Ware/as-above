// ─────────────────────────────────────────────────────────────────────────────
// Tablet character engine — config + pure math, no DOM. AsAboveApp owns the
// one rAF loop and writes transforms/attributes straight to refs; everything
// the loop obeys is tuned here.
//
// The design brief: NO crescendo anywhere. HATCH banked its drama budget and
// spent it at two poles; AS ABOVE spreads the budget as continuous, liquid
// motion through every element, all the time. Nothing is ever fully still
// (except the altar — the anchor), and nothing ever lurches:
//
//   float   — the tablet's levitation: three independent sines (bob, sway,
//             tilt) on incommensurate periods, like mass suspended in water
//   dip     — the decode's suspension physics: the tablet "takes the weight"
//             of the new words, sinks a few px, springs back (underdamped)
//   glow    — the phosphor aura breathes on its own period; a decode adds a
//             swell that decays exponentially
//   sky     — the body drifts almost imperceptibly; its halo breathes on a
//             different period per body; the swap is one continuous spring,
//             reversible mid-flight with preserved velocity
//   shadow  — the hover shadow on the altar answers the bob (sells the mass)
//
// Ranking law: every ambient amplitude here is smaller AND slower than any
// motion the user causes (dip max ≈ 13px vs bob 7px; swap 1.2s vs drift 30s).
// TABLET.alive = false renders the scene inert (facts still deal) — the
// one-line A/B kill-switch; the console's MOTION chip ANDs with it.
// ─────────────────────────────────────────────────────────────────────────────

import { DECODE_DEFAULTS, type DecodeOpts } from './decode';

export const TABLET = {
  /** Master switch: false = inert stage (facts still deal; motion stops). */
  alive: true,

  /** Levitation — three sines on incommensurate periods (never syncs). */
  float: {
    ampY: 7, // px bob
    periodY: 6200,
    ampX: 3.2, // px sway
    periodX: 9700,
    tiltDeg: 0.85, // slight independent tilt
    periodTilt: 12400,
  },

  /** The decode dip — underdamped so it sinks and rights itself in ~2 rings. */
  dip: {
    stiffness: 92,
    damping: 11, // ζ≈0.57
    kickPxPerSec: 130, // downward velocity impulse per decode (max dip ≈ 13px)
  },

  /** Phosphor aura: base presence, slow breath, decode swell. */
  glow: {
    base: 0.55,
    breatheDepth: 0.14,
    periodMs: 5400,
    swellBoost: 0.42, // added at decode, then decays
    swellDecayPerSec: 1.5,
  },

  /** Screen growth when a fact needs more slab (FLIP height spring). */
  grow: { stiffness: 220, damping: 27 },

  /** Decode cadence (pure math in lib/decode.ts; numbers owned here). */
  decode: { ...DECODE_DEFAULTS } satisfies DecodeOpts,

  /** The sky: drift at the threshold of notice; the swap is the second-
      biggest motion on stage and still not a pole. */
  sky: {
    driftAmp: 2.6, // px
    driftPeriodA: 27000,
    driftPeriodB: 34000,
    /** Manual spring on swap progress 0(sun)..1(moon): ~1.2s, a whisper of
        overshoot, reversible mid-flight. */
    swap: { stiffness: 11.5, damping: 6.1 },
    halo: {
      base: 0.42,
      depth: 0.2,
      periodSun: 7600,
      periodMoon: 10400,
    },
  },

  /** Hover shadow on the altar (opacity swings opposite the bob). */
  shadow: { base: 0.32, depth: 0.1 },

  /** The TRIGGER keycap — travel down fast, settle springy (the one bounce). */
  key: { travelPx: 4.5, pressMs: 45 },

  /** ORACLE — AUTO: the tablet re-decodes on its own after this much idle. */
  oracleIdleMs: 45_000,
} as const;

// ── Pure helpers ─────────────────────────────────────────────────────────────

/** Semi-implicit Euler damped-spring step (mutates nothing; returns next). */
export function springStep(
  x: number,
  v: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): [number, number] {
  const nextV = v + (-stiffness * (x - target) - damping * v) * dt;
  return [x + nextV * dt, nextV];
}

/** The levitation pose at time t (ms since engine birth). */
export function floatPose(tMs: number): { x: number; y: number; rot: number } {
  const f = TABLET.float;
  return {
    y: f.ampY * Math.sin((2 * Math.PI * tMs) / f.periodY),
    x: f.ampX * Math.sin((2 * Math.PI * tMs) / f.periodX + 1.1),
    rot: f.tiltDeg * Math.sin((2 * Math.PI * tMs) / f.periodTilt + 2.3),
  };
}

/**
 * The eclipse-adjacent swap choreography, as a pure map from spring progress
 * p (0=sun … 1=moon) to each body's pose: the leaving body sinks and recedes
 * while the arriving one rises through it. Clamped so mid-flight reversal is
 * seamless at any p (the spring may overshoot slightly past [0,1]).
 */
export function swapPose(p: number): {
  sun: { y: number; scale: number; opacity: number };
  moon: { y: number; scale: number; opacity: number };
} {
  const c = (v: number) => Math.max(0, Math.min(1, v));
  return {
    sun: {
      y: p * 26,
      scale: 1 - 0.16 * c(p),
      opacity: c(1 - 1.55 * p),
    },
    moon: {
      y: (1 - p) * 24,
      scale: 0.84 + 0.16 * c(p),
      opacity: c(1.55 * p - 0.55),
    },
  };
}
