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
//   glow    — the gem's aura breathes on its own period; a decode adds a
//             swell that decays exponentially
//   sky     — the body drifts almost imperceptibly; its halo breathes on a
//             different period per body; the swap is one continuous spring,
//             reversible mid-flight with preserved velocity
//   waves   — the world: rings radiating from the body across the viewport.
//             A phase-offset radial oscillation makes crests travel outward
//             forever; the SAME swell that surges the gem's glow swells the
//             wave amplitude, and every fire launches a pulse ring through
//             the field — press, rays, and tablet answer as one gesture
//   sheen   — the specular band on the gem slides with the float's tilt
//
// Ranking law: every ambient amplitude here is smaller AND slower than any
// motion the user causes (dip max ≈ 13px vs bob 7px; swap 1.2s vs drift 30s;
// wave crests drift for seconds, the press pulse crosses in ~1.7s). The
// earth (dunes) is the one still anchor. TABLET.alive = false renders the
// scene inert (facts still deal) — the one-line A/B kill-switch; the
// console's MOTION chip ANDs with it.
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

  /**
   * The wave field (SVG space: rings authored around the origin, radii in
   * a 1200-unit square). Crest travel: ring i oscillates on a shared period
   * with a per-ring phase lag — a radial phase gradient reads as waves
   * radiating outward, with no respawn seam anywhere.
   */
  waves: {
    ringCount: 9,
    innerRadius: 150, // svg units — ring 0 (the body's aura zone)
    outerRadius: 585, // ring N-1 ≈ the farthest corner (600u ↔ --wave-size/2)
    wobbleBase: 9, // per-vertex organic wobble, svg units…
    wobblePerRing: 2.6, // …growing slightly with radius
    travelPeriodMs: 8800, // one crest cycle
    phaseStepRad: 0.66, // per-ring lag — the outward travel
    ampU: 11, // radial crest height, svg units (constant px ≈ real wave)
    swellAmpBoost: 1.7, // the decode swell swells the sea too
    /** The press pulse: a bright ring racing the field. */
    pulse: {
      pool: 3, // simultaneous pulses (mash headroom)
      speedPerSec: 0.58, // full crossing ≈ 1.7s
      maxOpacity: 0.65,
      fromScale: 0.14,
      toScale: 1.2,
    },
  },

  /** The gem's specular band rides the float tilt (light stays celestial). */
  sheen: { travelPct: 16 },

  /** The TRIGGER glass pill — travel fast, settle liquid (the one bounce). */
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
