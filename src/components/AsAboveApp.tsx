'use client';

// The orchestrator. Owns the one rAF engine (every animated attribute on
// stage is written here, straight to refs — no per-frame React), the decode
// choreography, the sky swap spring, the keyboard paths, the console, and
// the oracle idle timer. Channel discipline: one writer per element —
// engine channels are listed in Tablet.tsx/Sky.tsx; Motion owns exactly two
// elements (the stage slide and the screen's FLIP height); CSS owns the
// seeded ambient dressing (gated in globals.css).

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { motion, useReducedMotion } from 'motion/react';
import type { BodyId, Fact } from '@/data/facts';
import { isSettled, planDecode, renderBlock } from '@/lib/decode';
import { GROW, PANEL_HEIGHT_MOBILE, PANEL_SPRING, REDUCED_FADE_MS } from '@/lib/motion';
import { makeSessionSeed, seededRng } from '@/lib/rand';
import {
  currentFact,
  initOracle,
  setMode as setOracleMode,
  trigger as dealFact,
  type OracleState,
} from '@/lib/state';
import { TABLET, floatPose, springStep, swapPose } from '@/lib/tablet';
import { Console } from './Console';
import { Dust } from './Dust';
import { SKY_CENTER, Sky, type SkyRefs } from './Sky';
import { Tablet, type TabletRefs } from './Tablet';
import { TriggerKey, type LensRefs, type TriggerKeyHandle } from './TriggerKey';
import { Waves, type WavesRefs } from './Waves';

type DecodePhase = 'idle' | 'decoding' | 'settled';

/** One ripple in flight: progress, origin (svg units, relative to the body
    center), the per-ring crossing distances, and whether its front has
    reached the body yet (the flare trigger). q ≥ 1 = idle slot. */
interface Pulse {
  q: number;
  dx: number;
  dy: number;
  bodyDist: number;
  hit: number[];
  flared: boolean;
}

interface EngineState {
  t0: number;
  last: number;
  swap: { x: number; v: number }; // 0=sun … 1=moon
  dip: { x: number; v: number };
  /** ONE swell drives the gem's glow surge AND the wave amplitude — the
      coherence spine: everything answers the same breath. */
  swell: number;
  /** The ripple's arrival at the body: halo + rays surge, then decay. */
  flare: number;
  pulses: Pulse[];
  /** Per-ring ripple kick, rebuilt each frame (preallocated, no GC churn). */
  kicks: number[];
  decode: { plan: ReturnType<typeof planDecode>; start: number } | null;
  lastText: [string, string, string];
  idleEpoch: number;
}

const idlePulse = (): Pulse => ({
  q: 1,
  dx: 0,
  dy: 0,
  bodyDist: 0,
  hit: [],
  flared: true,
});

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const C = SKY_CENTER;
const bodyTransform = (pose: { y: number; scale: number }) =>
  `translate(${C} ${C + pose.y}) scale(${pose.scale}) translate(${-C} ${-C})`;

export function AsAboveApp() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [booted, setBooted] = useState(false);
  const [seed, setSeed] = useState('');
  const [oracle, setOracle] = useState<OracleState | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [motionLive, setMotionLive] = useState(true);
  const [oracleAuto, setOracleAuto] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [decodePhase, setDecodePhase] = useState<DecodePhase>('idle');
  const [hintRetired, setHintRetired] = useState(false);
  const reduced = useReducedMotion() ?? false;

  const pickRng = useRef<() => number>(Math.random);
  const decodeRng = useRef<() => number>(Math.random);

  // ── Refs the engine writes to (one writer per element) ─────────────────────
  const skyRefs: SkyRefs = {
    drift: useRef(null),
    sun: useRef(null),
    moon: useRef(null),
    sunHalo: useRef(null),
    moonHalo: useRef(null),
  };
  const tabletRefs: TabletRefs = {
    drift: useRef(null),
    dip: useRef(null),
    aura: useRef(null),
    screen: useRef(null),
    sheen: useRef(null),
    textWrap: useRef(null),
    claim: useRef(null),
    lore: useRef(null),
    filed: useRef(null),
  };
  const wavesRefs: WavesRefs = {
    svg: useRef<SVGSVGElement | null>(null),
    rings: useRef<(SVGPathElement | null)[]>([]),
    pulses: useRef<(SVGGElement | null)[]>([]),
    radii: useRef<number[]>([]),
  };
  const raysRef = useRef<HTMLDivElement | null>(null);
  const keyZoneRef = useRef<HTMLDivElement | null>(null);
  const keyHandle = useRef<TriggerKeyHandle | null>(null);
  /** The key's windowed copy of the field (bent by the real lens) — the
      engine writes the same crest/ripple attributes to both trees. */
  const lensRefs: LensRefs = {
    svg: useRef<SVGSVGElement | null>(null),
    rings: useRef<(SVGPathElement | null)[]>([]),
    pulses: useRef<(SVGGElement | null)[]>([]),
  };
  const growAnim = useRef<ReturnType<typeof animate> | null>(null);

  const eng = useRef<EngineState>({
    t0: 0,
    last: 0,
    swap: { x: 0, v: 0 },
    dip: { x: 0, v: 0 },
    swell: 0,
    flare: 0,
    pulses: Array.from({ length: TABLET.waves.pulse.pool }, idlePulse),
    kicks: Array.from({ length: TABLET.waves.ringCount }, () => 0),
    decode: null,
    lastText: ['', '', ''],
    idleEpoch: 0,
  });

  /** Launch a ripple through the field FROM ITS CAUSE: the key for a press,
      the body for a sky swap. Origin is mapped into wave-svg units once per
      fire (a user event, never per frame), and each ring's crossing distance
      is precomputed so the front can kick rings and flare the body as it
      travels. */
  const firePulse = useCallback((origin: 'key' | 'body') => {
    const st = eng.current;
    const slot = st.pulses.findIndex((p) => p.q >= 1);
    const p = st.pulses[slot >= 0 ? slot : 0];
    let dx = 0;
    let dy = 0;
    const svg = wavesRefs.svg.current;
    const zone = keyZoneRef.current;
    if (origin === 'key' && svg && zone) {
      const s = svg.getBoundingClientRect();
      const z = zone.getBoundingClientRect();
      if (s.width > 0) {
        const toU = 1200 / s.width; // svg viewBox is a 1200u square
        dx = (z.left + z.width / 2 - (s.left + s.width / 2)) * toU;
        dy = (z.top + z.height / 2 - (s.top + s.height / 2)) * toU;
      }
    }
    p.q = 0;
    p.dx = dx;
    p.dy = dy;
    p.bodyDist = Math.hypot(dx, dy);
    p.hit = wavesRefs.radii.current.map((R) => Math.abs(p.bodyDist - R));
    p.flared = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live mirrors for the loop (props/state read per frame without re-binding).
  const live = useRef({ inert: false, mode: 'sun' as BodyId });
  live.current = {
    inert: reduced || !motionLive || !TABLET.alive,
    mode: oracle?.mode ?? 'sun',
  };

  // ── Boot: mint the session, wait for the faces, raise the ready signal ─────
  useEffect(() => {
    let cancelled = false;
    const s = makeSessionSeed();
    pickRng.current = seededRng(`${s}:pick`);
    decodeRng.current = seededRng(`${s}:decode`);
    setOracle(initOracle(pickRng.current));
    setSeed(s);
    const ready = () => {
      if (!cancelled) setBooted(true);
    };
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(ready);
    } else {
      ready();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // The mode lives on <html> too: body paint, overscroll fills, and the
  // token override all follow the sky from the root down.
  useEffect(() => {
    if (oracle) document.documentElement.dataset.mode = oracle.mode;
  }, [oracle]);

  // ── Decode choreography (imperative, ref-driven) ───────────────────────────

  const writeDecodeFrame = useCallback(
    (now: number) => {
      const st = eng.current;
      if (!st.decode) return;
      const t = now - st.decode.start;
      const els = [tabletRefs.claim.current, tabletRefs.lore.current, tabletRefs.filed.current];
      for (let b = 0; b < 3; b += 1) {
        const el = els[b];
        if (!el) continue;
        const s = renderBlock(st.decode.plan, b, t);
        if (s !== st.lastText[b]) {
          el.textContent = s;
          st.lastText[b] = s;
        }
      }
      if (isSettled(st.decode.plan, t)) {
        st.decode = null;
        setDecodePhase('settled');
      }
    },
    // Refs are stable; nothing here re-binds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** FLIP the screen height to fit the (already written) content. */
  const flipGrow = useCallback((instant: boolean) => {
    const screen = tabletRefs.screen.current;
    if (!screen) return;
    growAnim.current?.stop();
    const h0 = screen.offsetHeight;
    screen.style.height = 'auto';
    const h1 = screen.offsetHeight;
    if (instant || Math.abs(h1 - h0) < 1) {
      screen.style.height = h1 > 0 ? `${h1}px` : '';
      return;
    }
    screen.style.height = `${h0}px`;
    growAnim.current = animate(screen, { height: `${h1}px` }, GROW);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginDecode = useCallback(
    (fact: Fact, pulseFrom: 'key' | null = 'key') => {
      const st = eng.current;
      st.idleEpoch += 1;
      const texts: [string, string, string] = [
        fact.claim,
        fact.lore,
        `filed under: ${fact.filedUnder}`,
      ];
      if (live.current.inert) {
        // Reduced-motion / STILL path: the decode becomes a crossfade —
        // function fully preserved, no boil, no dip. 'settled' is raised
        // only once the words are actually on the glass.
        st.decode = null;
        const wrap = tabletRefs.textWrap.current;
        const write = () => {
          const els = [tabletRefs.claim.current, tabletRefs.lore.current, tabletRefs.filed.current];
          els.forEach((el, i) => {
            if (el) el.textContent = texts[i];
            st.lastText[i] = texts[i];
          });
          flipGrow(true);
          setDecodePhase('settled');
        };
        if (!wrap) {
          write();
        } else {
          setDecodePhase('decoding');
          wrap.style.transition = `opacity ${REDUCED_FADE_MS}ms ease`;
          wrap.style.opacity = '0';
          window.setTimeout(() => {
            write();
            // Hand opacity back to the stylesheet (data-visible owns it).
            wrap.style.opacity = '';
            window.setTimeout(() => {
              wrap.style.transition = '';
            }, REDUCED_FADE_MS + 40);
          }, REDUCED_FADE_MS);
        }
        return;
      }
      // The live decode: retarget mid-flight friendly — a fresh plan simply
      // adopts the boiling screen as its starting field.
      st.decode = { plan: planDecode(texts, decodeRng.current, TABLET.decode), start: performance.now() };
      st.swell = 1; // the shared breath: gem glow AND wave amplitude
      st.dip.v += TABLET.dip.kickPxPerSec; // the tablet takes the weight
      if (pulseFrom) firePulse(pulseFrom); // the world answers, from below
      writeDecodeFrame(performance.now()); // answer on THIS frame
      flipGrow(false);
      setDecodePhase('decoding');
    },
    // Refs are stable containers; only the callbacks matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flipGrow, writeDecodeFrame, firePulse],
  );

  /** The sky swapped to a body that hasn't spoken: settle back to idle glyphs. */
  const beginIdle = useCallback(() => {
    const st = eng.current;
    st.decode = null;
    st.idleEpoch += 1;
    const epoch = st.idleEpoch;
    setDecodePhase('idle');
    window.setTimeout(() => {
      if (eng.current.idleEpoch !== epoch) return; // a decode intervened
      const els = [tabletRefs.claim.current, tabletRefs.lore.current, tabletRefs.filed.current];
      els.forEach((el, i) => {
        if (el) el.textContent = '';
        eng.current.lastText[i] = '';
      });
      flipGrow(false);
    }, 500); // after the text layer's fade-out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipGrow]);

  // ── The verbs ──────────────────────────────────────────────────────────────

  const fire = useCallback(() => {
    setOracle((prev) => (prev ? dealFact(prev, pickRng.current) : prev));
  }, []);

  const toggleMode = useCallback(() => {
    setOracle((prev) =>
      prev ? setOracleMode(prev, prev.mode === 'sun' ? 'moon' : 'sun') : prev,
    );
  }, []);

  // New pick → decode it.
  const lastSerial = useRef(0);
  useEffect(() => {
    if (!oracle || oracle.serial === lastSerial.current) return;
    lastSerial.current = oracle.serial;
    const fact = currentFact(oracle);
    if (fact) {
      beginDecode(fact);
      setHintRetired(true);
    }
  }, [oracle, beginDecode]);

  // Sky swapped → the tablet leans into the new light and re-speaks that
  // body's memory (or settles to glyphs if it has none).
  const lastMode = useRef<BodyId | null>(null);
  useEffect(() => {
    if (!oracle) return;
    if (lastMode.current === null) {
      lastMode.current = oracle.mode;
      return;
    }
    if (lastMode.current === oracle.mode) return;
    lastMode.current = oracle.mode;
    eng.current.dip.v += TABLET.dip.kickPxPerSec * 0.4;
    // The sky announces itself: this ripple radiates from the BODY (and
    // flares its rays at launch) — the swap's one pulse, so the re-speak
    // below must not add a key-origin ripple of its own.
    if (!live.current.inert) firePulse('body');
    const fact = currentFact(oracle);
    if (fact) beginDecode(fact, null);
    else beginIdle();
  }, [oracle, beginDecode, beginIdle, firePulse]);

  // ── The engine — one rAF loop, every frame, writes straight to refs ────────
  useEffect(() => {
    if (!booted) return;
    const st = eng.current;
    st.t0 = performance.now();
    st.last = st.t0;
    let raf = 0;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      const t = now - st.t0;
      const L = live.current;

      // The sky swap — a spring toward the mode, reversible at any frame.
      const target = L.mode === 'moon' ? 1 : 0;
      if (L.inert) {
        st.swap.x = target;
        st.swap.v = 0;
      } else {
        [st.swap.x, st.swap.v] = springStep(
          st.swap.x,
          st.swap.v,
          target,
          TABLET.sky.swap.stiffness,
          TABLET.sky.swap.damping,
          dt,
        );
      }
      const pose = swapPose(st.swap.x);
      const sunEl = skyRefs.sun.current;
      if (sunEl) {
        sunEl.setAttribute('transform', bodyTransform(pose.sun));
        sunEl.setAttribute('opacity', pose.sun.opacity.toFixed(3));
      }
      const moonEl = skyRefs.moon.current;
      if (moonEl) {
        moonEl.setAttribute('transform', bodyTransform(pose.moon));
        moonEl.setAttribute('opacity', pose.moon.opacity.toFixed(3));
      }

      // The ripple's arrival flare decays toward rest…
      const P = TABLET.waves.pulse;
      st.flare = Math.max(0, st.flare - P.flareDecayPerSec * dt);
      if (L.inert) st.flare = 0;

      // …and halos breathe on per-body periods, carried by their body's
      // presence, surging when a ripple front reaches them.
      const halo = TABLET.sky.halo;
      const sunHalo = skyRefs.sunHalo.current;
      if (sunHalo) {
        const breath = L.inert ? 0 : halo.depth * Math.sin((TAU * t) / halo.periodSun);
        sunHalo.setAttribute(
          'opacity',
          (clamp01(halo.base + breath + st.flare * P.flareBoost) * pose.sun.opacity).toFixed(3),
        );
      }
      const moonHalo = skyRefs.moonHalo.current;
      if (moonHalo) {
        const breath = L.inert ? 0 : halo.depth * Math.sin((TAU * t) / halo.periodMoon + 1.4);
        moonHalo.setAttribute(
          'opacity',
          (clamp01(halo.base + breath + st.flare * P.flareBoost) * pose.moon.opacity).toFixed(3),
        );
      }

      // The rays behind the body: invisible at rest, blooming and slowly
      // wheeling while the flare lives — the sun/moon answering the press.
      const rays = raysRef.current;
      if (rays) {
        if (L.inert || st.flare <= 0.004) {
          if (rays.style.opacity !== '0') rays.style.opacity = '0';
        } else {
          const bodyPresence = Math.max(pose.sun.opacity, pose.moon.opacity);
          rays.style.opacity = (st.flare * P.raysMaxOpacity * bodyPresence).toFixed(3);
          const wheel = ((t / 1000) * P.raysDegPerSec) % 360;
          const spread = 1 + (1 - st.flare) * 0.1; // the bloom disperses as it fades
          rays.style.transform = `translateX(-50%) rotate(${wheel.toFixed(2)}deg) scale(${spread.toFixed(3)})`;
        }
      }

      // The body drifts at the threshold of notice.
      const driftEl = skyRefs.drift.current;
      if (driftEl) {
        const dx = L.inert ? 0 : TABLET.sky.driftAmp * Math.sin((TAU * t) / TABLET.sky.driftPeriodA);
        const dy = L.inert
          ? 0
          : TABLET.sky.driftAmp * 0.7 * Math.sin((TAU * t) / TABLET.sky.driftPeriodB + 1.7);
        driftEl.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
      }

      // The tablet levitates — plumb, always: a pure vertical bob.
      const f = L.inert ? { y: 0 } : floatPose(t);
      const driftDiv = tabletRefs.drift.current;
      if (driftDiv) {
        driftDiv.style.transform = `translate3d(0px, ${f.y.toFixed(2)}px, 0)`;
      }

      // …and takes the weight of new words.
      [st.dip.x, st.dip.v] = springStep(
        st.dip.x,
        st.dip.v,
        0,
        TABLET.dip.stiffness,
        TABLET.dip.damping,
        dt,
      );
      if (L.inert) {
        st.dip.x = 0;
        st.dip.v = 0;
      }
      const dipDiv = tabletRefs.dip.current;
      if (dipDiv) dipDiv.style.transform = `translateY(${st.dip.x.toFixed(2)}px)`;

      // The glow breathes; a decode adds a swell that decays.
      st.swell = Math.max(0, st.swell - TABLET.glow.swellDecayPerSec * dt);
      const breathe = L.inert
        ? 0
        : TABLET.glow.breatheDepth * Math.sin((TAU * t) / TABLET.glow.periodMs);
      const aura = tabletRefs.aura.current;
      if (aura) {
        aura.style.opacity = clamp01(
          TABLET.glow.base + breathe + st.swell * TABLET.glow.swellBoost,
        ).toFixed(3);
      }

      // The gem's specular sheen wanders on its own slow period (the tablet
      // no longer tilts; the celestial light itself drifts across it).
      const sheen = tabletRefs.sheen.current;
      if (sheen) {
        const slide = L.inert
          ? 0
          : TABLET.sheen.travelPct * Math.sin((TAU * t) / TABLET.sheen.periodMs + 0.7);
        sheen.style.transform = `translateX(${slide.toFixed(2)}%)`;
      }

      // The ripples: each front expands from its origin, kicks every wave
      // ring as it crosses it, and flares the body the moment it arrives.
      const W = TABLET.waves;
      const radii = wavesRefs.radii.current;
      const kicks = st.kicks;
      kicks.fill(0);
      for (let p = 0; p < st.pulses.length; p += 1) {
        const pulse = st.pulses[p];
        const el = wavesRefs.pulses.current[p];
        if (!el) continue;
        if (pulse.q >= 1) {
          if (el.getAttribute('opacity') !== '0') el.setAttribute('opacity', '0');
          const lensPulse = lensRefs.pulses.current[p];
          if (lensPulse && lensPulse.getAttribute('opacity') !== '0') {
            lensPulse.setAttribute('opacity', '0');
          }
          continue;
        }
        pulse.q = Math.min(1, pulse.q + dt * W.pulse.speedPerSec);
        const q = pulse.q;
        // Quadratic, not cubic: the front still leaps off the key but keeps
        // traveling visibly through the far field instead of teleporting.
        const easeOut = 1 - (1 - q) * (1 - q);
        const sc = W.pulse.fromScale + (W.pulse.toScale - W.pulse.fromScale) * easeOut;
        const radiusU = sc * W.innerRadius;
        const pulseTransform = `translate(${pulse.dx.toFixed(1)} ${pulse.dy.toFixed(1)}) scale(${sc.toFixed(4)})`;
        const pulseOpacity = (Math.pow(1 - q, 1.35) * W.pulse.maxOpacity).toFixed(3);
        el.setAttribute('transform', pulseTransform);
        el.setAttribute('opacity', pulseOpacity);
        const lensPulse = lensRefs.pulses.current[p];
        if (lensPulse) {
          lensPulse.setAttribute('transform', pulseTransform);
          lensPulse.setAttribute('opacity', pulseOpacity);
        }
        if (!pulse.flared && radiusU >= pulse.bodyDist) {
          pulse.flared = true;
          st.flare = 1; // the front reaches the body: halo + rays answer
        }
        // The front's energy thins as it spreads.
        const energy = 1 - q * 0.55;
        for (let i = 0; i < pulse.hit.length && i < kicks.length; i += 1) {
          const span = Math.abs(radiusU - pulse.hit[i]) / W.pulse.kickWidthU;
          if (span < 1) {
            const k = (1 - span) * (1 - span);
            kicks[i] += W.pulse.kickAmpU * k * energy;
          }
        }
      }

      // The sea: a phase-lagged crest travels the rings outward forever; the
      // decode's swell raises the whole field's amplitude for a breath, and
      // a passing ripple front heaves each ring in turn.
      const crest = W.ampU * (1 + st.swell * W.swellAmpBoost);
      for (let i = 0; i < radii.length; i += 1) {
        const ring = wavesRefs.rings.current[i];
        if (!ring) continue;
        const s = L.inert
          ? 1
          : 1 +
            (crest * Math.sin((TAU * t) / W.travelPeriodMs - i * W.phaseStepRad) + kicks[i]) /
              radii[i];
        const ringTransform = `scale(${s.toFixed(4)})`;
        ring.setAttribute('transform', ringTransform);
        const lensRing = lensRefs.rings.current[i];
        if (lensRing) lensRing.setAttribute('transform', ringTransform);
      }

      // The decode boils toward legibility.
      writeDecodeFrame(now);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [booted, writeDecodeFrame, skyRefs.sun, skyRefs.moon, skyRefs.sunHalo, skyRefs.moonHalo, skyRefs.drift, tabletRefs.drift, tabletRefs.dip, tabletRefs.aura, tabletRefs.sheen, wavesRefs.rings, wavesRefs.pulses, wavesRefs.radii, lensRefs.rings, lensRefs.pulses, raysRef]);

  // ── Keyboard: Enter/Space fire from anywhere; S flips the sky ──────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest(
        'button, [role="radio"], [role="button"], input, textarea, select, a',
      );
      if (e.key === 'Enter' || e.key === ' ') {
        if (interactive) return; // let the focused control behave
        e.preventDefault();
        if (e.repeat) return;
        keyHandle.current?.press();
        fire();
      } else if ((e.key === 's' || e.key === 'S') && !e.repeat) {
        if (el?.closest('input, textarea')) return;
        toggleMode();
      } else if (e.key === 'Escape') {
        setConsoleOpen(false);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') keyHandle.current?.release();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [fire, toggleMode]);

  // ── ORACLE — AUTO: left alone, the tablet re-decodes on its own ────────────
  const lastActivity = useRef(0);
  useEffect(() => {
    lastActivity.current = Date.now();
    const poke = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener('pointerdown', poke, { passive: true });
    window.addEventListener('keydown', poke);
    return () => {
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
    };
  }, []);
  useEffect(() => {
    if (!booted || !oracleAuto) return;
    const iv = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivity.current >= TABLET.oracleIdleMs) {
        lastActivity.current = Date.now();
        fire();
      }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [booted, oracleAuto, fire]);

  // The key's lens window: aim its viewBox at the exact patch of the field
  // behind the key, in wave units, so the copy is pixel-aligned with the
  // real sea (invisible seam at rest; the lens bends it from there).
  const syncLensWindow = useCallback(() => {
    const field = wavesRefs.svg.current;
    const copy = lensRefs.svg.current;
    const scene = copy?.parentElement;
    if (!field || !copy || !scene) return;
    const fr = field.getBoundingClientRect();
    const sr = scene.getBoundingClientRect();
    if (fr.width < 1 || sr.width < 1) return;
    const toU = 1200 / fr.width;
    copy.setAttribute(
      'viewBox',
      `${((sr.left - fr.left) * toU).toFixed(2)} ${((sr.top - fr.top) * toU).toFixed(2)} ${(sr.width * toU).toFixed(2)} ${(sr.height * toU).toFixed(2)}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!booted) return;
    syncLensWindow();
    // The stage's entrance animation translates the key (inside .stage)
    // relative to the field (outside it) — re-aim once it has landed.
    const settle = window.setTimeout(syncLensWindow, 950);
    return () => window.clearTimeout(settle);
  }, [booted, syncLensWindow]);

  // Explicit px heights survive resizes badly; hand back to CSS on resize —
  // and re-aim the lens window at the field.
  useEffect(() => {
    const onResize = () => {
      const screen = tabletRefs.screen.current;
      if (screen) screen.style.height = '';
      syncLensWindow();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncLensWindow]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!booted || !oracle) {
    return <main className="app-root" data-ready="false" aria-busy="true" />;
  }

  const fact = currentFact(oracle);

  return (
    <main
      className="app-root"
      data-ready="true"
      data-mode={oracle.mode}
      data-decode={decodePhase}
      data-console={consoleOpen ? 'open' : 'closed'}
      data-motion={motionLive && !reduced && TABLET.alive ? 'live' : 'still'}
    >
      <motion.div
        className="stage-slide"
        initial={false}
        animate={{ y: consoleOpen && isMobile ? -PANEL_HEIGHT_MOBILE : 0 }}
        transition={PANEL_SPRING}
      >
        <Waves seed={seed} refs={wavesRefs} />
        <div className="stage">
          {/* The ray bloom lives BENEATH the body (same z, earlier paint):
              invisible until a ripple front arrives. Engine-owned. */}
          <div ref={raysRef} className="sky-rays" aria-hidden="true" />
          <Sky refs={skyRefs} />
          {/* The earth is retired from the stage for now (Dunes.tsx and its
              tokens stay — it may return); the wave field runs to the floor. */}
          <Dust seed={seed} />
          <Tablet
            refs={tabletRefs}
            seed={seed}
            hasFact={fact !== null}
            fact={fact}
            showHint={!hintRetired}
            onTap={fire}
          />
          <div className="key-zone" ref={keyZoneRef}>
            <TriggerKey ref={keyHandle} seed={seed} lensRefs={lensRefs} onFire={fire} />
          </div>
        </div>
      </motion.div>
      <Console
        open={consoleOpen}
        onToggle={() => setConsoleOpen((v) => !v)}
        mode={oracle.mode}
        onMode={(m) => setOracle((prev) => (prev ? setOracleMode(prev, m) : prev))}
        motionLive={motionLive}
        onMotionLive={setMotionLive}
        oracleAuto={oracleAuto}
        onOracleAuto={setOracleAuto}
        isMobile={isMobile}
      />
    </main>
  );
}
