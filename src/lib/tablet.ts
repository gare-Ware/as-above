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
//   dip     — the fire's suspension physics: the tablet "takes the weight"
//             of the new words, sinks a few px, springs back (underdamped)
//   breath  — the fire's anticipation on the stone itself: the tablet
//             INHALES (a centered, narrower-dominant contraction) on the
//             sea's own gulp clock and releases as the ripple is born —
//             the slab always dips below its final size, then expands
//   glow    — the gem's aura breathes on its own period; a fire adds a
//             swell that decays exponentially
//   sky     — the body drifts almost imperceptibly; its halo breathes on a
//             different period per body; the swap is one continuous spring,
//             reversible mid-flight with preserved velocity
//   waves   — the world: rings radiating from the body across the viewport.
//             A phase-offset radial oscillation makes crests travel outward
//             forever; the SAME swell that surges the gem's glow swells the
//             wave amplitude, and every fire launches a ripple FROM THE BODY
//             (sun or moon): halo + rays FLARE at launch and the front
//             cascades outward with the waves, kicking each ring in turn as
//             it crosses, then LANDS on the ring nearest the key — the
//             light dies fast (a flash that cascades) while a thump and its
//             after-thump ring the water down to still — above answers
//             below as one continuous gesture, spent where it lands
//   sheen   — the specular band on the gem drifts on its own slow period
//             (the tablet no longer tilts, so the light itself wanders)
//
// Ranking law: every ambient amplitude here is smaller AND slower than any
// motion the user causes (dip max ≈ 13px vs bob 7px; swap 1.2s vs drift 30s;
// wave crests drift for seconds, the gulp swallows in ~0.32s and the front
// lands on its terminal ring well inside a second). The
// earth (dunes) is the one still anchor. TABLET.alive = false renders the
// scene inert (facts still deal) — the one-line A/B kill-switch; the
// console's MOTION chip ANDs with it.
// ─────────────────────────────────────────────────────────────────────────────

import { ENGRAVE_DEFAULTS, type EngraveOpts } from './engrave';

export const TABLET = {
  /** Master switch: false = inert stage (facts still deal; motion stops). */
  alive: true,

  /** Levitation — a single vertical sine: the tablet stays perfectly plumb. */
  float: {
    ampY: 7, // px bob
    periodY: 6200,
  },

  /** The fire dip — underdamped so it sinks and rights itself in ~2 rings. */
  dip: {
    stiffness: 92,
    damping: 11, // ζ≈0.57
    kickPxPerSec: 130, // downward velocity impulse per fire (max dip ≈ 13px)
  },

  /** The stone inhales with the sea: at every fire the tablet contracts
      about its center on the SAME gulp clock as the wave field — narrower-
      dominant (an inward pull, per the gulp's grammar, not a squash-and-
      stretch) — and releases as the ripple is born, so the slab's perceived
      size always dips below its final size and EXPANDS to it. A spring
      chases the gulp envelope (interactive = springs: a mash retargets with
      velocity, never snaps), slightly underdamped so the release carries a
      whisper of expansion past rest. Transform-only, on the dip channel:
      real width would reflow the monospace wrap under the four engrave
      layers; real height would clip the outgoing text still standing on
      the lower stone. */
  breath: {
    ampX: 0.025, // scaleX at full gulp (~9px on a 350px slab — outranks the 7px bob)
    ampY: 0.015, // scaleY at full gulp — shallower: the pull reads NARROWER
    /** The stiffest spring in the engine (ω=30 — it must track a 320ms
        envelope with only a ~35ms heavier-than-water lag). At that rate
        the loop's dt clamp (0.05s) puts one-step Euler past stability, so
        the engine SUB-STEPS this spring — never integrate it with a raw
        frame dt (measured: a long settle frame flipped the sigh into a
        +0.6% expansion spike). */
    stiffness: 900,
    damping: 36, // ζ≈0.6
    /** The release's whisper: after the gulp lets go, the envelope dips
        this far NEGATIVE (an expansion past rest, as a fraction of the
        full gulp) before settling — the spring alone can't overshoot,
        since it tracks a target that decelerates smoothly to zero. */
    rebound: 0.12,
    reboundFrac: 0.4, // the whisper's width, as a fraction of gulp.ms
    /** Settle-exhale impulse when a SHORTER fact lands (the shrink case):
        the slab dips just below its final size and rises into it — the
        last visible move is always an expansion. (An underdamped HEIGHT
        spring was rejected: it clips into the face's bottom padding and
        flattens silently at min-height.) */
    sighKick: 24,
  },

  /** The gem's aura: base presence, slow breath, per-fire swell. */
  glow: {
    base: 0.55,
    breatheDepth: 0.14,
    periodMs: 5400,
    swellBoost: 0.42, // added at fire, then decays
    swellDecayPerSec: 1.5,
  },

  /** Screen growth when a fact needs more slab (FLIP height spring —
      numbers live in lib/motion.ts GROW; mirrored here for the record).
      Soft on purpose: the slab breathes to size, it never pops — measured
      at fire, growth LAUNCHES at the gulp's release (the ripple's birth)
      and expands ahead of the write edge; a shrink exhales at settle,
      answered by the breath's sigh. */
  grow: { stiffness: 90, damping: 20 },

  /** The engraving sweep (pure math in lib/engrave.ts; numbers owned here). */
  engrave: { ...ENGRAVE_DEFAULTS } satisfies EngraveOpts,

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
    swellAmpBoost: 1.7, // the fire's swell swells the sea too
    /** The gulp — the fire's anticipation: the whole sea pulls inward for
        one breath (a constant-u swallow toward the body, half-sine envelope)
        and the ripple is born as it releases. User-caused, so it outranks
        the ambient crest (15u > ampU 11). */
    gulp: {
      ampU: 15, // inward swallow depth, svg units (sin² envelope — see the engine)
      ms: 320, // the whole breath
      launchFrac: 0.7, // the ripple is born THIS far into the gulp (overlap, not sequence)
    },
    /** The ripple: an unseen front born AT THE BODY as the gulp releases,
        flaring halo + rays at birth — no shape is drawn over the field;
        instead each ring KICKS (radial heave) and WASHES (flushes toward
        the body's light, --pulse) as the front crosses its radius. The
        front does NOT permeate the scene: it glides to rest ON the terminal
        ring — the ring NEAREST THE KEY, measured at fire — and LANDS there:
        the arrival glow lingers as an ember on that ring (the dwell) with a
        touchdown thump and a candle-rate roil, ringing down to dark instead
        of vanishing. Anchored to the key (fixed in the layout), not the
        tablet, so the journey never changes length with the fact. */
    pulse: {
      pool: 3, // simultaneous ripples (mash headroom)
      speedPerSec: 2.1, // journey to the terminal ring (sine ease — glides to rest;
      //                   ~480ms: a shockwave that visibly crosses the sea, fast)
      fromScale: 0.04, // a point at the body; the stop radius is measured per fire
      kickAmpU: 20, // radial kick a ring gets as the front crosses it
      kickWidthU: 135, // kernel half-width of that kick, svg units (wider = more
      //                  rings lit at once, longer rise per ring — the anti-chop knob)
      washMax: 0.5, // peak wash-twin opacity — the ring at the front's crest
      flareBoost: 0.5, // halo opacity surge as the ripple is born at the body
      flareDecayPerSec: 1.5,
      raysMaxOpacity: 0.8, // the ray bloom behind the body at full flare
      raysDegPerSec: 6, // the rays' slow shimmer rotation while lit
      /** The dwell — the landing. The energy that crossed the sea doesn't
          vanish at the terminal ring; it LANDS — but light and water part
          ways here: the arrival LIGHT dies fast (lightMs — the whole
          cascade reads as a flash that lands), while the WATER keeps
          moving: a springy touchdown thump (damped sine — heave, slosh
          back, a fainter after-thump) rings down with the kick relaxation
          over the full dwell. A lingering glow ember was tried and cut —
          the flash is the drama; the movement is the residue. */
      dwell: {
        ms: 850, // movement ring-down: kick relaxation + thump, touchdown → still
        lightMs: 170, // the light's death AFTER geometric arrival…
        lightLeadMs: 90, // …opening THIS far before it: one ease-out spans the
        //                  brake and the landing (q-time, which never stalls),
        //                  so the flash starts dying as the front brakes in and
        //                  the light never sits still waiting for the thump
        thumpAmpU: 14, // touchdown heave on the terminal ring
        thumpHz: 2.2, // damped sine — ~2 lobes inside the dwell (thump, after-thump)
        thumpDecayPerSec: 3.5,
      },
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

  /** ORACLE — AUTO: the tablet speaks again on its own after this much idle. */
  oracleIdleMs: 45_000,

  /** THE INTRO — the world is born once per load, in the fire's own grammar
      run in reverse order of rank: first the WORLD (rings grow out of the
      sun, the birth flare blooming at t0), then the WORD (the poster inks
      in, thin→black), then the STONE (a real fire: gulp → release → the
      tablet condenses as the ripple crosses its station), and the ripple
      LANDS at the key's ring — where the key materializes on the thump:
      the answer lands where the hand will be, and input goes live there.
      All beats are virtual-clock / slowMs'd, so SLOWMO stretches the whole
      opening. */
  intro: {
    /** The rings' birth — engine-driven, pure math (ringBirthPose). */
    birth: {
      fromU: 55, // collapsed radius: tucked under the disc + halo
      ringMs: 950, // one ring's growth, cubic ease-out (fluid, no overshoot)
      ringStaggerMs: 110, // inner→outer — the sea radiates into being
      fadeMs: 220, // per-ring opacity ramp as it emerges
    },
    /** The poster begins while the outer rings are still arriving —
        overlap, not sequence (the same law as the gulp's launchFrac). */
    posterAtMs: 1000,
    /** The stone's birth fire: firePulse() runs the full gulp → release →
        ripple grammar; the tablet's condense launches at the release. */
    tabletAtMs: 2400,
    /** The key materializes on the ripple's touchdown thump:
        tabletAtMs + gulp.ms·launchFrac + 1000/pulse.speedPerSec ≈ the
        front's landing. Re-derive if the gulp or pulse speed is retuned —
        this beat only reads if the key is born AS the light dies on its
        ring. */
    keyAtMs: 3100,
    doneAtMs: 3600,
    /** The condense: scale keyframes under the GROW spring (the slab's one
        growth voice), opacity leading slightly — born as light, then mass. */
    tabletBirth: { fromScale: 0.86, opacityMs: 380 },
    /** Reduced motion / STILL: the intro is one quiet crossfade. */
    reducedDoneMs: 450,
  },
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

/** How long the whole ring birth takes (the last ring's finish). */
export function ringBirthTotalMs(): number {
  const I = TABLET.intro.birth;
  return (TABLET.waves.ringCount - 1) * I.ringStaggerMs + I.ringMs;
}

/**
 * The world's birth — ring i's pose at t ms since the intro opened: a radius
 * multiplier (collapsed under the body → 1 at rest) and the ring's opacity
 * ramp. Cubic ease-out, no overshoot: the sea is AMBIENT-ranked even while
 * being born — the drama lives in the t0 flare, not in the water lurching.
 * Pure and clamped: t past the end (or a huge t) is exactly the resting
 * pose, so the engine can call it unguarded.
 */
export function ringBirthPose(tMs: number, i: number, R: number): { scale: number; opacity: number } {
  const I = TABLET.intro.birth;
  const c = (v: number) => Math.max(0, Math.min(1, v));
  const age = tMs - i * I.ringStaggerMs;
  const p = c(age / I.ringMs);
  const e = 1 - (1 - p) ** 3;
  const from = Math.min(I.fromU, R); // never a scale-UP birth, whatever the radii
  return {
    scale: (from + (R - from) * e) / R,
    opacity: c(age / I.fadeMs),
  };
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
