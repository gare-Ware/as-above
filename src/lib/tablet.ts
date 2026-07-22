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
//   float   — the tablet's levitation: a pure vertical bob (the tablet is
//             always plumb — symmetry is the design language; no sway, no tilt)
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
//             wave amplitude, and every fire launches a ripple FROM ITS CAUSE
//             (the key for a press, the body for a sky swap) that races the
//             field, kicks each ring as its front passes, and FLARES the
//             body's halo + rays when it arrives — below answers above as
//             one continuous gesture
//   sheen   — the specular band on the gem drifts on its own slow period
//             (the tablet no longer tilts, so the light itself wanders)
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

  /** Levitation — a single vertical sine: the tablet stays perfectly plumb. */
  float: {
    ampY: 7, // px bob
    periodY: 6200,
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

  /** Screen growth when a fact needs more slab (FLIP height spring —
      numbers live in lib/motion.ts GROW; mirrored here for the record).
      Soft on purpose: the slab breathes to size, it never pops. */
  grow: { stiffness: 110, damping: 22 },

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
    /** The ripple: a two-ring front launched FROM ITS CAUSE (key or body),
        racing the whole field, kicking each wave ring as it passes and
        flaring the body's halo + rays on arrival. */
    pulse: {
      pool: 3, // simultaneous ripples (mash headroom)
      speedPerSec: 0.46, // full crossing ≈ 2.2s (quadratic ease — savored, not snapped)
      maxOpacity: 0.8,
      fromScale: 0.04, // a point at the cause…
      toScale: 7.4, // …to past the farthest corner (radius ≈ 1110u)
      echoOpacity: 0.4, // the trailing soft ring (thick faint stroke = glow)
      kickAmpU: 20, // radial kick a ring gets as the front crosses it
      kickWidthU: 115, // kernel half-width of that kick, svg units
      flareBoost: 0.5, // halo opacity surge when the front reaches the body
      flareDecayPerSec: 1.5,
      raysMaxOpacity: 0.8, // the ray bloom behind the body at full flare
      raysDegPerSec: 6, // the rays' slow shimmer rotation while lit
    },
  },

  /** The gem's specular band — its own slow incommensurate wander (small:
      at the extremes it must never park on a rail and fake a side-light). */
  sheen: { travelPct: 9, periodMs: 15400 },

  /** The glass key — travel fast, settle liquid (the one bounce). The lens
      is REAL refraction (feDisplacementMap over a windowed copy of the
      field — lib/lens.ts); the press deepens the bend. */
  key: {
    travelPx: 3,
    pressMs: 45,
    /** bleedPx: how far the field copy paints beyond the visible pill —
        rim displacement must never sample past the source's edge (that
        composites transparent black: Chromium's speckled border). */
    lens: { depth: 26, strength: 60, chroma: 0.12, pressBoost: 1.45, bleedPx: 24 },
  },

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

/** The levitation pose at time t (ms since engine birth) — plumb, bob only. */
export function floatPose(tMs: number): { y: number } {
  const f = TABLET.float;
  return {
    y: f.ampY * Math.sin((2 * Math.PI * tMs) / f.periodY),
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
