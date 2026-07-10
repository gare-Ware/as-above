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
import { Altar } from './Altar';
import { Console } from './Console';
import { Dust } from './Dust';
import { Sky, type SkyRefs } from './Sky';
import { Tablet, type TabletRefs } from './Tablet';
import { TriggerKey, type TriggerKeyHandle } from './TriggerKey';

type DecodePhase = 'idle' | 'decoding' | 'settled';

interface EngineState {
  t0: number;
  last: number;
  swap: { x: number; v: number }; // 0=sun … 1=moon
  dip: { x: number; v: number };
  swell: number;
  decode: { plan: ReturnType<typeof planDecode>; start: number } | null;
  lastText: [string, string, string];
  idleEpoch: number;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const bodyTransform = (pose: { y: number; scale: number }) =>
  `translate(110 ${110 + pose.y}) scale(${pose.scale}) translate(-110 -110)`;

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
    textWrap: useRef(null),
    claim: useRef(null),
    lore: useRef(null),
    filed: useRef(null),
  };
  const shadowRef = useRef<SVGEllipseElement | null>(null);
  const keyHandle = useRef<TriggerKeyHandle | null>(null);
  const growAnim = useRef<ReturnType<typeof animate> | null>(null);

  const eng = useRef<EngineState>({
    t0: 0,
    last: 0,
    swap: { x: 0, v: 0 },
    dip: { x: 0, v: 0 },
    swell: 0,
    decode: null,
    lastText: ['', '', ''],
    idleEpoch: 0,
  });

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
    (fact: Fact) => {
      const st = eng.current;
      st.idleEpoch += 1;
      const texts: [string, string, string] = [
        fact.claim,
        fact.lore,
        `filed under: ${fact.filedUnder}`,
      ];
      if (live.current.inert) {
        // Reduced-motion / STILL path: the decode becomes a crossfade —
        // function fully preserved, no boil, no dip.
        st.decode = null;
        const wrap = tabletRefs.textWrap.current;
        const write = () => {
          const els = [tabletRefs.claim.current, tabletRefs.lore.current, tabletRefs.filed.current];
          els.forEach((el, i) => {
            if (el) el.textContent = texts[i];
            st.lastText[i] = texts[i];
          });
          flipGrow(true);
        };
        if (!wrap) {
          write();
        } else {
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
        setDecodePhase('settled');
        return;
      }
      // The live decode: retarget mid-flight friendly — a fresh plan simply
      // adopts the boiling screen as its starting field.
      st.decode = { plan: planDecode(texts, decodeRng.current, TABLET.decode), start: performance.now() };
      st.swell = 1; // glow swell
      st.dip.v += TABLET.dip.kickPxPerSec; // the tablet takes the weight
      writeDecodeFrame(performance.now()); // answer on THIS frame
      flipGrow(false);
      setDecodePhase('decoding');
    },
    // Refs are stable containers; only the two callbacks matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flipGrow, writeDecodeFrame],
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
    const fact = currentFact(oracle);
    if (fact) beginDecode(fact);
    else beginIdle();
  }, [oracle, beginDecode, beginIdle]);

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

      // Halos breathe on per-body periods, carried by their body's presence.
      const halo = TABLET.sky.halo;
      const sunHalo = skyRefs.sunHalo.current;
      if (sunHalo) {
        const breath = L.inert ? 0 : halo.depth * Math.sin((TAU * t) / halo.periodSun);
        sunHalo.setAttribute('opacity', (clamp01(halo.base + breath) * pose.sun.opacity).toFixed(3));
      }
      const moonHalo = skyRefs.moonHalo.current;
      if (moonHalo) {
        const breath = L.inert ? 0 : halo.depth * Math.sin((TAU * t) / halo.periodMoon + 1.4);
        moonHalo.setAttribute(
          'opacity',
          (clamp01(halo.base + breath) * pose.moon.opacity).toFixed(3),
        );
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

      // The tablet levitates…
      const f = L.inert ? { x: 0, y: 0, rot: 0 } : floatPose(t);
      const driftDiv = tabletRefs.drift.current;
      if (driftDiv) {
        driftDiv.style.transform = `translate3d(${f.x.toFixed(2)}px, ${f.y.toFixed(2)}px, 0) rotate(${f.rot.toFixed(3)}deg)`;
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

      // The hover shadow answers the bob (lower tablet → deeper, wider shadow).
      const sh = shadowRef.current;
      if (sh) {
        const norm = Math.max(-1, Math.min(1, (f.y + st.dip.x) / 14));
        sh.setAttribute('opacity', (TABLET.shadow.base + TABLET.shadow.depth * norm).toFixed(3));
        sh.setAttribute('rx', (92 * (1 + 0.045 * norm)).toFixed(1));
      }

      // The decode boils toward legibility.
      writeDecodeFrame(now);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [booted, writeDecodeFrame, skyRefs.sun, skyRefs.moon, skyRefs.sunHalo, skyRefs.moonHalo, skyRefs.drift, tabletRefs.drift, tabletRefs.dip, tabletRefs.aura]);

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

  // Explicit px heights survive resizes badly; hand back to CSS on resize.
  useEffect(() => {
    const onResize = () => {
      const screen = tabletRefs.screen.current;
      if (screen) screen.style.height = '';
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="backdrop-sun" aria-hidden="true" />
        <div className="backdrop-moon" aria-hidden="true" />
        <div className="stage">
          <h1 className="wordmark">As Above</h1>
          <Sky refs={skyRefs} />
          <Dust seed={seed} />
          <div className="ground" aria-hidden="true" />
          <Altar seed={seed} shadowRef={shadowRef} />
          <Tablet
            refs={tabletRefs}
            seed={seed}
            hasFact={fact !== null}
            fact={fact}
            showHint={!hintRetired}
            onTap={fire}
          />
          <div className="key-zone">
            <TriggerKey ref={keyHandle} onFire={fire} />
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
