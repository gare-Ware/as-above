'use client';

// The orchestrator. Owns the one rAF engine (every animated attribute on
// stage is written here, straight to refs — no per-frame React), the
// engraving choreography, the sky swap spring, the keyboard paths, the
// console, and the oracle idle timer. Channel discipline: one writer per element —
// engine channels are listed in Tablet.tsx/Sky.tsx; Motion owns exactly two
// elements (the stage slide and the screen's FLIP height); CSS owns the
// seeded ambient dressing (gated in globals.css).

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { motion, useReducedMotion } from 'motion/react';
import type { BodyId, Fact } from '@/data/facts';
import { engraveFrame, planEngrave, PROMOTE_THRESHOLD, type EngravePlan } from '@/lib/engrave';
import { GROW, PANEL_HEIGHT_MOBILE, PANEL_SPRING, REDUCED_FADE_MS } from '@/lib/motion';
import { makeSessionSeed, seededRng } from '@/lib/rand';
import {
  currentFact,
  initOracle,
  setMode as setOracleMode,
  trigger as dealFact,
  type OracleState,
} from '@/lib/state';
import { SLOWMO, slow, slowMs } from '@/lib/slowmo';
import { TABLET, floatPose, springStep, swapPose } from '@/lib/tablet';
import { Console } from './Console';
import { Dust } from './Dust';
import { SKY_CENTER, Sky, type SkyRefs } from './Sky';
import { Tablet, type TabletRefs } from './Tablet';
import { TriggerKey, type LensRefs, type TriggerKeyHandle } from './TriggerKey';
import { Waves, type WavesRefs } from './Waves';

type DecodePhase = 'idle' | 'decoding' | 'settled';

/** One ripple in flight: born at the body's center once its wait (the gulp
    overlap) runs out, gliding to rest on stopU — the terminal ring, measured
    at fire — then DWELLING there (d: 0→1, the landing ember ringing down).
    q ≥ 1 AND d ≥ 1 with no wait = idle slot. */
interface Pulse {
  q: number;
  /** ms until birth — the ripple waits out most of the gulp. */
  wait: number;
  /** The terminal radius: the first ring past the tablet's bottom edge. */
  stopU: number;
  /** Dwell progress 0→1 once the front has landed (q = 1): the touchdown
      thump and the ember's ring-down live here. */
  d: number;
}

interface EngineState {
  t0: number;
  last: number;
  /** The VIRTUAL clock (ms) — real time ÷ SLOWMO, accumulated per frame.
      Every time anchor in the fire (gulpStart, engrave.start) is minted
      from this, and the loop reads it wherever it once read `now`, so the
      slow-mo dial stretches the whole choreography coherently. At
      SLOWMO = 1 it tracks performance.now() exactly. */
  vnow: number;
  swap: { x: number; v: number }; // 0=sun … 1=moon
  dip: { x: number; v: number };
  /** The stone's inhale (0=rest … 1=full gulp): a spring chasing the sea's
      gulp envelope, written as a centered narrower-dominant scale on the
      dip channel. The settle sigh (shrink case) kicks its velocity. */
  squeeze: { x: number; v: number };
  /** ONE swell drives the gem's glow surge AND the wave amplitude — the
      coherence spine: everything answers the same breath. */
  swell: number;
  /** The ripple's birth at the body: halo + rays surge, then decay. */
  flare: number;
  pulses: Pulse[];
  /** Per-ring ripple kick, rebuilt each frame (preallocated, no GC churn). */
  kicks: number[];
  /** Per-ring wash — the shock carried IN the field: each ring flushes
      toward the body's light as the front crosses it. washPrev mirrors the
      last written opacity so idle frames skip the DOM entirely. */
  wash: number[];
  washPrev: number[];
  /** performance.now() of the last fire — the gulp envelope's birth. */
  gulpStart: number;
  engrave: { plan: EngravePlan; start: number } | null;
  /** The ONE px span both normalized edges map onto: max(outgoing height,
      incoming height) + EDGE_RAMP. Shared on purpose — with separate spans
      the write edge can spatially outrun the erase edge (short old text,
      long new text) and land letters on un-erased stone. The ramp lets the
      bands slide OFF the box before the settle — no pop. */
  span: number;
  /** A shorter fact holds the taller stone through the pass; the exhale
      runs at settle (shrinking mid-pass would clip the outgoing text). */
  pendingShrink: boolean;
  /** Last written vars — idle frames skip the DOM entirely. */
  lastEdgeIn: number;
  lastEdgeOut: number;
  lastLit: number;
  lastText: [string, string, string];
  idleEpoch: number;
}

const idlePulse = (): Pulse => ({ q: 1, wait: 0, stopU: 0, d: 1 });

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** px past a text layer's height that its edge travels — the gold bands'
    off-ramp, so the light slides OFF the box before the settle. */
const EDGE_RAMP = 130;
/** A promoted half-written fact keeps glowing this far past its write edge
    (the band's ghost lead) — the cap freezes there. */
const CAP_LEAD = 42;
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
    claimLit: useRef(null),
    loreLit: useRef(null),
    filedLit: useRef(null),
    outWrap: useRef(null),
    outLitWrap: useRef(null),
    claimOut: useRef(null),
    loreOut: useRef(null),
    filedOut: useRef(null),
    claimOutLit: useRef(null),
    loreOutLit: useRef(null),
    filedOutLit: useRef(null),
  };
  const wavesRefs: WavesRefs = {
    svg: useRef<SVGSVGElement | null>(null),
    rings: useRef<(SVGGElement | null)[]>([]),
    washes: useRef<(SVGPathElement | null)[]>([]),
    radii: useRef<number[]>([]),
  };
  const raysRef = useRef<HTMLDivElement | null>(null);
  /** The key's slot in the layout — the ripple's terminal ring is measured
      to it (fixed, unlike the tablet, which grows with each fact). */
  const keyZoneRef = useRef<HTMLDivElement | null>(null);
  const keyHandle = useRef<TriggerKeyHandle | null>(null);
  /** The key's windowed copy of the field (bent by the real lens) — the
      engine writes the same crest/ripple attributes to both trees. */
  const lensRefs: LensRefs = {
    svg: useRef<SVGSVGElement | null>(null),
    rings: useRef<(SVGGElement | null)[]>([]),
    washes: useRef<(SVGPathElement | null)[]>([]),
  };
  const growAnim = useRef<ReturnType<typeof animate> | null>(null);

  const eng = useRef<EngineState>({
    t0: 0,
    last: 0,
    swap: { x: 0, v: 0 },
    dip: { x: 0, v: 0 },
    squeeze: { x: 0, v: 0 },
    swell: 0,
    flare: 0,
    pulses: Array.from({ length: TABLET.waves.pulse.pool }, idlePulse),
    kicks: Array.from({ length: TABLET.waves.ringCount }, () => 0),
    wash: Array.from({ length: TABLET.waves.ringCount }, () => 0),
    washPrev: Array.from({ length: TABLET.waves.ringCount }, () => 0),
    gulpStart: -1e9,
    vnow: 0,
    engrave: null,
    span: 0,
    pendingShrink: false,
    lastEdgeIn: 99999,
    lastEdgeOut: 99999,
    lastLit: 0,
    lastText: ['', '', ''],
    idleEpoch: 0,
  });

  /** Fire the sky's answer. First the sea GULPS — every ring pulls inward
      for one breath — and as it releases, a ripple is born at the body
      (halo + rays flare at THAT moment, not at the press) and cascades
      outward only as far as the TERMINAL ring: the ring NEAREST THE KEY,
      measured here, once per fire (a user event, never per frame). The key
      is fixed in the layout, so the journey is the same length every time —
      anchoring to the tablet made it jump with each fact's height. Every
      fire — press, tap, keyboard, oracle, sky swap — speaks this same
      grammar. */
  const firePulse = useCallback(() => {
    const st = eng.current;
    const radii = wavesRefs.radii.current;
    const slot = st.pulses.findIndex((p) => p.q >= 1 && p.d >= 1 && p.wait <= 0);
    const p = st.pulses[slot >= 0 ? slot : 0];
    // The terminal ring. Fallback: the outermost (odd geometry, no key).
    let stopU = radii[radii.length - 1] ?? TABLET.waves.outerRadius;
    const svg = wavesRefs.svg.current;
    const zone = keyZoneRef.current;
    if (svg && zone) {
      const s = svg.getBoundingClientRect();
      if (s.width > 0) {
        const z = zone.getBoundingClientRect();
        // Distance from the body (svg center) down to the key's center.
        const dU = (z.top + z.height / 2 - (s.top + s.height / 2)) * (1200 / s.width);
        // NEAREST, not first-past: the light lands ON the key's ring rather
        // than overshooting to whatever ring happens to clear it.
        let best = stopU;
        let bestGap = Infinity;
        for (const R of radii) {
          const gap = Math.abs(R - dU);
          if (gap < bestGap) {
            bestGap = gap;
            best = R;
          }
        }
        stopU = best;
      }
    }
    p.q = 0;
    p.d = 0;
    p.wait = TABLET.waves.gulp.ms * TABLET.waves.gulp.launchFrac;
    p.stopU = stopU;
    // Virtual clock (falls back to real time if a fire somehow precedes the
    // engine's first frame) — the gulp stretches with the slow-mo dial.
    st.gulpStart = st.vnow || performance.now();
    // Refs are stable containers; nothing here re-binds.
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

  // ── Engraving choreography (imperative, ref-driven) ────────────────────────

  /** Write the same text to the incoming carved base and its gold twin —
      a pair must never disagree, or the writing-light would show different
      words than the stone. `lastText` mirrors this pair: it is what the
      stone will hold once the pass lands. */
  const writeTexts = useCallback((texts: readonly string[]) => {
    const st = eng.current;
    const base = [tabletRefs.claim.current, tabletRefs.lore.current, tabletRefs.filed.current];
    const lit = [tabletRefs.claimLit.current, tabletRefs.loreLit.current, tabletRefs.filedLit.current];
    for (let b = 0; b < 3; b += 1) {
      const s = texts[b] ?? '';
      const el = base[b];
      if (el) el.textContent = s;
      const twin = lit[b];
      if (twin) twin.textContent = s;
      st.lastText[b] = s;
    }
    // Refs are stable; nothing here re-binds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Write the outgoing pair — the text the erase edge will lift away. */
  const writeOutTexts = useCallback((texts: readonly string[]) => {
    const base = [tabletRefs.claimOut.current, tabletRefs.loreOut.current, tabletRefs.filedOut.current];
    const lit = [
      tabletRefs.claimOutLit.current,
      tabletRefs.loreOutLit.current,
      tabletRefs.filedOutLit.current,
    ];
    for (let b = 0; b < 3; b += 1) {
      const s = texts[b] ?? '';
      const el = base[b];
      if (el) el.textContent = s;
      const twin = lit[b];
      if (twin) twin.textContent = s;
    }
    // Refs are stable; nothing here re-binds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** FLIP the screen height to fit the (already written) content. `preH0`
      is the height measured BEFORE the text swap — without it, a face that
      has no explicit height yet (first fire, post-resize) measures the NEW
      content's height as its start and snaps instead of breathing. With
      `deferShrink`, a shrinking face holds its height and raises
      pendingShrink instead — the outgoing text is still on the stone, and
      shrinking under it would clip its unerased tail; the exhale runs at
      the settle. A fire passes `delayMs` (the gulp's launch overlap) so the
      expansion launches at the RELEASE, in step with the ripple's birth —
      the height is measured and pinned now, the spring waits. */
  const flipGrow = useCallback(
    (instant: boolean, preH0?: number, deferShrink = false, delayMs = 0) => {
      const screen = tabletRefs.screen.current;
      if (!screen) return;
      growAnim.current?.stop();
      const h0 = preH0 ?? screen.offsetHeight;
      screen.style.height = 'auto';
      const h1 = screen.offsetHeight;
      if (instant || Math.abs(h1 - h0) < 1) {
        screen.style.height = h1 > 0 ? `${h1}px` : '';
        return;
      }
      screen.style.height = `${h0}px`;
      if (deferShrink && h1 < h0) {
        eng.current.pendingShrink = true;
        return;
      }
      growAnim.current = animate(
        screen,
        { height: `${h1}px` },
        slow(delayMs > 0 ? { ...GROW, delay: delayMs / 1000 } : GROW),
      );
    },
    // Refs are stable containers; nothing here re-binds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const writeEngraveFrame = useCallback(
    (now: number) => {
      const st = eng.current;
      if (!st.engrave) return;
      const fr = engraveFrame(st.engrave.plan, now - st.engrave.start);
      const wrap = tabletRefs.textWrap.current;
      if (wrap) {
        const edgeIn = fr.writeE * st.span;
        if (Math.abs(edgeIn - st.lastEdgeIn) > 0.05) {
          st.lastEdgeIn = edgeIn;
          wrap.style.setProperty('--edge-in', edgeIn.toFixed(1));
        }
        if (st.engrave.plan.hasOut) {
          const edgeOut = fr.eraseE * st.span;
          if (Math.abs(edgeOut - st.lastEdgeOut) > 0.05) {
            st.lastEdgeOut = edgeOut;
            wrap.style.setProperty('--edge-out', edgeOut.toFixed(1));
          }
        }
        // The bands breathe a little while the light works — candle, not
        // laser.
        const lit = fr.phase === 'sweep' ? 0.9 + 0.1 * Math.sin((TAU * now) / 340) : 0;
        if (Math.abs(lit - st.lastLit) > 0.01) {
          st.lastLit = lit;
          wrap.style.setProperty('--lit', lit.toFixed(3));
        }
      }
      if (fr.phase === 'settled') {
        st.engrave = null;
        if (wrap) {
          // Park the light: incoming fully carved, outgoing hidden — both
          // extremes sit off the box, so there is no seam to pop.
          st.lastEdgeIn = 99999;
          st.lastEdgeOut = 99999;
          wrap.style.setProperty('--edge-in', '99999');
          wrap.style.setProperty('--edge-out', '99999');
          wrap.style.setProperty('--cap-out', '99999');
        }
        if (st.pendingShrink) {
          st.pendingShrink = false;
          flipGrow(false); // the stone exhales to the shorter fact…
          // …and SIGHS: a squeeze impulse dips the slab just below its
          // final size and releases, so even a shrink ends as an expansion
          // — landing on the gold-cooling beat.
          st.squeeze.v += TABLET.breath.sighKick;
        }
        setDecodePhase('settled');
      }
    },
    // Refs are stable; only the callbacks matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flipGrow],
  );

  const beginDecode = useCallback(
    (fact: Fact, withPulse = true) => {
      const st = eng.current;
      st.idleEpoch += 1;
      const texts: [string, string, string] = [
        fact.claim,
        fact.lore,
        `filed under: ${fact.filedUnder}`,
      ];
      if (live.current.inert) {
        // Reduced-motion / STILL path: the engraving becomes a crossfade —
        // function fully preserved, no sweep, no dip. 'settled' is raised
        // only once the words are actually on the glass.
        st.engrave = null;
        st.pendingShrink = false;
        const wrap = tabletRefs.textWrap.current;
        // Park the writing-light (a live pass may have been mid-flight).
        st.lastEdgeIn = 99999;
        st.lastEdgeOut = 99999;
        st.lastLit = 0;
        wrap?.style.setProperty('--edge-in', '99999');
        wrap?.style.setProperty('--edge-out', '99999');
        wrap?.style.setProperty('--cap-out', '99999');
        wrap?.style.setProperty('--lit', '0');
        const write = () => {
          writeTexts(texts);
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
      // The live engraving: one downward pass. A retrigger re-plans from
      // the current frame — an early pass keeps erasing from the same edge
      // while the write restarts at the top; a late pass promotes the
      // half-written fact to the outgoing layer (its written extent frozen
      // as the cap) and erases it from the top.
      let outTexts: readonly string[] = [...st.lastText];
      let eraseFromPx = 0;
      let keepOut = false;
      let promoteCapPx: number | null = null;
      if (st.engrave) {
        const cur = engraveFrame(st.engrave.plan, st.vnow - st.engrave.start);
        if (cur.phase === 'sweep' && st.engrave.plan.hasOut && cur.writeE < PROMOTE_THRESHOLD) {
          outTexts = st.engrave.plan.outTexts;
          eraseFromPx = cur.eraseE * st.span; // px continuity across the re-plan
          keepOut = true; // the outgoing layer carries straight on
        } else if (cur.phase === 'sweep') {
          outTexts = st.engrave.plan.inTexts;
          promoteCapPx = cur.writeE * st.span + CAP_LEAD;
        }
      }
      const wrap = tabletRefs.textWrap.current;
      // Measure BEFORE touching any text: the outgoing layer inherits the
      // stone's current content height, and the FLIP needs the pre-swap
      // face height (a face with no explicit height yet would otherwise
      // measure the new content as its start and snap).
      const hPrev = wrap?.offsetHeight ?? 0;
      const h0Face = tabletRefs.screen.current?.offsetHeight;
      if (!keepOut) {
        writeOutTexts(outTexts);
        const outEl = tabletRefs.outWrap.current;
        const outLitEl = tabletRefs.outLitWrap.current;
        if (outEl) outEl.style.height = `${hPrev}px`;
        if (outLitEl) outLitEl.style.height = `${hPrev}px`;
        const cap = promoteCapPx ?? 99999;
        wrap?.style.setProperty('--cap-out', cap.toFixed(1));
      }
      writeTexts(texts);
      const hIn = wrap?.offsetHeight ?? 0;
      // ONE span for both edges (see EngineState.span). A continuing erase
      // must never see its span shrink mid-flight, and its resumed edge is
      // re-normalized so the px position carries over exactly.
      const newSpan = keepOut
        ? Math.max(st.span, hIn + EDGE_RAMP)
        : Math.max(hPrev, hIn) + EDGE_RAMP;
      const eraseFrom = keepOut && newSpan > 0 ? eraseFromPx / newSpan : 0;
      st.span = newSpan;
      // The FLIP: measure NOW, launch at the gulp's RELEASE — the stone
      // inhales with the sea (the breath squeeze, on the dip channel),
      // then expands toward its new size the instant the ripple is born
      // above, still ahead of the write edge. A gulp runs on every live
      // path (a fire starts one here; a sky swap fires its own pulse just
      // before re-speaking), so the delay always has a release to meet. A
      // shrink waits for the settle (deferShrink), since the outgoing text
      // still stands on the lower stone.
      st.pendingShrink = false;
      flipGrow(false, h0Face, true, TABLET.waves.gulp.ms * TABLET.waves.gulp.launchFrac);
      st.engrave = {
        plan: planEngrave(outTexts, texts, eraseFrom, TABLET.engrave),
        start: st.vnow,
      };
      st.swell = 1; // the shared breath: gem glow AND wave amplitude
      st.dip.v += TABLET.dip.kickPxPerSec; // the tablet takes the weight
      if (withPulse) firePulse(); // the sky answers: the ripple is born above
      writeEngraveFrame(st.vnow); // answer on THIS frame
      setDecodePhase('decoding');
    },
    // Refs are stable containers; only the callbacks matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flipGrow, writeTexts, writeOutTexts, writeEngraveFrame, firePulse],
  );

  /** The sky swapped to a body that hasn't spoken: settle back to idle glyphs. */
  const beginIdle = useCallback(() => {
    const st = eng.current;
    st.engrave = null;
    st.idleEpoch += 1;
    const epoch = st.idleEpoch;
    setDecodePhase('idle');
    window.setTimeout(() => {
      if (eng.current.idleEpoch !== epoch) return; // an engraving intervened
      writeTexts(['', '', '']);
      writeOutTexts(['', '', '']);
      // Park the writing-light behind the fade-out (a pass may have been
      // mid-flight when the sky turned).
      const wrap = tabletRefs.textWrap.current;
      eng.current.lastEdgeIn = 99999;
      eng.current.lastEdgeOut = 99999;
      eng.current.lastLit = 0;
      eng.current.pendingShrink = false;
      wrap?.style.setProperty('--edge-in', '99999');
      wrap?.style.setProperty('--edge-out', '99999');
      wrap?.style.setProperty('--cap-out', '99999');
      wrap?.style.setProperty('--lit', '0');
      flipGrow(false);
    }, slowMs(500)); // after the text layer's fade-out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipGrow, writeTexts, writeOutTexts]);

  // ── The verbs ──────────────────────────────────────────────────────────────

  const fire = useCallback(() => {
    setOracle((prev) => (prev ? dealFact(prev, pickRng.current) : prev));
  }, []);

  const toggleMode = useCallback(() => {
    setOracle((prev) =>
      prev ? setOracleMode(prev, prev.mode === 'sun' ? 'moon' : 'sun') : prev,
    );
  }, []);

  // New pick → engrave it.
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
    // The sky announces itself: the swap's one pulse, so the re-speak
    // below must not add a second ripple of its own.
    if (!live.current.inert) firePulse();
    const fact = currentFact(oracle);
    if (fact) beginDecode(fact, false);
    else beginIdle();
  }, [oracle, beginDecode, beginIdle, firePulse]);

  // ── The engine — one rAF loop, every frame, writes straight to refs ────────
  useEffect(() => {
    if (!booted) return;
    const st = eng.current;
    st.t0 = performance.now();
    st.last = st.t0;
    st.vnow = st.t0; // the virtual clock opens on real time…
    let raf = 0;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      // …and advances at 1/SLOWMO speed: dt is virtual seconds, and every
      // anchor-based read below uses st.vnow, never `now` — one dial.
      const dt = Math.min(0.05, (now - st.last) / 1000) / SLOWMO;
      st.last = now;
      st.vnow += dt * 1000;
      const t = st.vnow - st.t0;
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

      // The ripple's launch flare decays toward rest…
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

      // The gulp clock — ONE envelope for sea and stone (coherence spine):
      // the wave rings swallow inward by gulpU below while the tablet's
      // squeeze chases the same curve here.
      // sin², not sin: a plain half-sine still has velocity when it hits the
      // end and clamps to 0 — a kink that lands at ~320ms, exactly where the
      // innermost ring peaks. Squaring it starts and ENDS at zero velocity,
      // so the swallow releases into the cascade instead of stopping dead.
      const W = TABLET.waves;
      const G = W.gulp;
      const gulpP = (st.vnow - st.gulpStart) / G.ms;
      const gulpSin = Math.sin(Math.PI * gulpP);
      const gulpEnv = gulpP >= 0 && gulpP < 1 ? gulpSin * gulpSin : 0;
      const gulpU = L.inert ? 0 : -G.ampU * gulpEnv;

      // …and takes the weight of new words — and INHALES with the sea: the
      // squeeze spring chases the shared gulp envelope (interactive =
      // springs: a mash retargets with velocity instead of snapping). The
      // stone's target adds the release WHISPER — a small negative lobe
      // (expansion past rest) after the gulp lets go, same clock.
      const B = TABLET.breath;
      let squeezeTarget = gulpEnv;
      if (gulpP >= 1 && gulpP < 1 + B.reboundFrac) {
        const r = Math.sin((Math.PI * (gulpP - 1)) / B.reboundFrac);
        squeezeTarget = -B.rebound * r * r;
      }
      [st.dip.x, st.dip.v] = springStep(
        st.dip.x,
        st.dip.v,
        0,
        TABLET.dip.stiffness,
        TABLET.dip.damping,
        dt,
      );
      // The breath is the engine's stiffest spring (ω=30): one Euler step
      // at the dt clamp (0.05s) sits past the stability edge — a long
      // frame at the settle flipped the sigh into an expansion spike.
      // Sub-step it so ω·h stays ≤ 0.25.
      {
        const steps = Math.max(1, Math.ceil(dt * 120));
        const h = dt / steps;
        for (let k = 0; k < steps; k += 1) {
          [st.squeeze.x, st.squeeze.v] = springStep(
            st.squeeze.x,
            st.squeeze.v,
            L.inert ? 0 : squeezeTarget,
            B.stiffness,
            B.damping,
            h,
          );
        }
      }
      if (L.inert) {
        st.dip.x = 0;
        st.dip.v = 0;
        st.squeeze.x = 0;
        st.squeeze.v = 0;
      }
      const dipDiv = tabletRefs.dip.current;
      if (dipDiv) {
        // One writer, one transform: dip (translateY) + breath (centered
        // scale, narrower-dominant). Scale, never layout — width would
        // reflow the monospace wrap, height would clip the standing
        // outgoing text.
        const sx = 1 - B.ampX * st.squeeze.x;
        const sy = 1 - B.ampY * st.squeeze.x;
        dipDiv.style.transform = `translateY(${st.dip.x.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      }

      // The glow breathes; a fire adds a swell that decays.
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

      // The ripples: pure math, nothing drawn over the field. Each front
      // waits out most of the gulp, is born at the body (halo + rays flare
      // at THAT frame), glides to rest on its terminal ring — and LANDS:
      // the arrival glow doesn't vanish, it dwells there as an ember with a
      // springy touchdown thump and a candle-rate roil, ringing down to
      // dark. One kernel per front drives BOTH answers a ring gives: the
      // kick (radial heave) and the wash (flush toward the body's light).
      const radii = wavesRefs.radii.current;
      const kicks = st.kicks;
      const wash = st.wash;
      kicks.fill(0);
      wash.fill(0);
      for (let p = 0; p < st.pulses.length; p += 1) {
        const pulse = st.pulses[p];
        if (pulse.q >= 1 && pulse.d >= 1) continue;
        if (pulse.wait > 0) {
          // The sea is still swallowing — the ripple is born on the release.
          pulse.wait -= dt * 1000;
          if (pulse.wait > 0) continue;
          st.flare = 1; // birth: halo + rays ignite as the front leaves the body
        }
        let radiusU: number;
        let washE: number;
        let kickE: number;
        // The dwell glow opens where the flight's thinning ends (1 − 0.35),
        // so touchdown hands the landing exactly the light the front
        // arrived with — value-continuous across the q = 1 seam.
        const ARRIVAL = 0.65;
        const D = W.pulse.dwell;
        // ONE light clock spans the brake and the landing: it opens
        // lightLeadMs before geometric arrival and runs lightMs past it.
        // The clock is q-time — q advances at a constant rate even while
        // the eased POSITION glides to rest — so the fade never sits
        // still. (Slow-mo found the hiccup this kills: with the fade keyed
        // to q = 1, the sine ease's zero-velocity glide parked the light
        // near-constant for ~90ms and the glow read as WAITING for the
        // thump before finishing.) 1−sin ease-out: full decay rate from
        // the first frame — the arrival is a crest (rise, peak, die), not
        // a hold — landing at zero slope, no pop. The thump then crests
        // over light that is already mostly gone: the water answers,
        // nothing gates.
        const LIGHT_TOTAL = D.lightLeadMs + D.lightMs;
        let lightT: number; // ms into the light's death
        if (pulse.q < 1) {
          // In flight: the front leaps off the body, then GLIDES to rest on
          // the terminal ring — arrival, not exit. Sine ease-out, NOT
          // quadratic: both land at zero velocity, but quadratic launches at
          // 2× the average speed, which crossed the inner rings in ~3 frames
          // each and read as chop. Sine peaks at 1.57×, so ring crossings
          // are far more evenly spaced across the journey.
          pulse.q = Math.min(1, pulse.q + dt * W.pulse.speedPerSec);
          const q = pulse.q;
          const easeOut = Math.sin(q * Math.PI * 0.5);
          const startU = W.pulse.fromScale * W.innerRadius;
          radiusU = startU + (pulse.stopU - startU) * easeOut;
          // Energy thins a little in flight — front-loaded, the body SENDS.
          // (An old (1 − q⁵) term extinguished everything at arrival; the
          // light died the frame it landed and read as anticlimax.)
          const energy = 1 - q * 0.35;
          // Time to geometric arrival at q's constant rate:
          lightT = Math.max(0, D.lightLeadMs - ((1 - q) / W.pulse.speedPerSec) * 1000);
          washE = energy;
          kickE = W.pulse.kickAmpU * energy;
        } else {
          // Landed. The kernel parks on the terminal ring, and light and
          // water part ways: the light finishes its death clock while the
          // WATER keeps moving — the kick relaxation rides the full-dwell
          // raised cosine and a damped-sine thump lands on top: heave,
          // slosh back, a fainter after-thump. All envelopes are
          // value-continuous at touchdown and zero-slope at their ends.
          pulse.d = Math.min(1, pulse.d + (dt * 1000) / D.ms);
          const tau = (pulse.d * D.ms) / 1000; // seconds since touchdown
          radiusU = pulse.stopU;
          lightT = D.lightLeadMs + tau * 1000;
          washE = ARRIVAL;
          const move = 0.5 * (1 + Math.cos(Math.PI * pulse.d));
          kickE =
            W.pulse.kickAmpU * ARRIVAL * move +
            D.thumpAmpU * Math.exp(-tau * D.thumpDecayPerSec) * Math.sin(TAU * D.thumpHz * tau);
        }
        // The shared fade + collapse: the light dies on the one clock, and
        // its kernel half-width converges to the terminal ring on that same
        // clock — the shockwave dims WHILE it lands, one gesture, so the
        // neighbors extinguish in sequence and the light is never a frozen
        // band (slow-mo showed exactly that before the collapse: ~100ms
        // static, then a synchronized fade — read as "jumps to gone").
        const lightProg = Math.min(1, lightT / LIGHT_TOTAL);
        washE *= 1 - Math.sin((Math.PI / 2) * lightProg);
        const washWidthU = W.pulse.kickWidthU * (1 - lightProg) + 1;
        for (let i = 0; i < radii.length && i < kicks.length; i += 1) {
          const gap = Math.abs(radiusU - radii[i]);
          const span = gap / W.pulse.kickWidthU;
          if (span < 1) {
            // Raised cosine (Hann), NOT a squared falloff: zero slope at the
            // apex AND at both edges, so a ring brightens and dims with no
            // corner. `(1−span)²` peaked at a cusp — a visible tick as the
            // front passed each ring — and carried less energy mid-span, so
            // fewer rings overlapped.
            kicks[i] += kickE * 0.5 * (1 + Math.cos(Math.PI * span));
          }
          // The light rides its own (collapsing) kernel — identical to the
          // kick's in flight, converging on the terminal ring in the dwell.
          const spanW = gap / washWidthU;
          if (spanW < 1) {
            wash[i] += washE * 0.5 * (1 + Math.cos(Math.PI * spanW));
          }
        }
      }

      // The sea: a phase-lagged crest travels the rings outward forever; the
      // fire's swell raises the whole field's amplitude for a breath; a
      // passing ripple front heaves each ring — and lights it — in turn; and
      // the gulp (gulpU — computed beside the tablet's squeeze above: one
      // envelope, sea and stone) pulls the WHOLE sea inward for one breath
      // at every fire (constant-u, like the crests, so the swallow reads
      // evenly).
      const crest = W.ampU * (1 + st.swell * W.swellAmpBoost);
      for (let i = 0; i < radii.length; i += 1) {
        const ring = wavesRefs.rings.current[i];
        if (!ring) continue;
        const s = L.inert
          ? 1
          : 1 +
            (crest * Math.sin((TAU * t) / W.travelPeriodMs - i * W.phaseStepRad) +
              kicks[i] +
              gulpU) /
              radii[i];
        const ringTransform = `scale(${s.toFixed(4)})`;
        ring.setAttribute('transform', ringTransform);
        const lensRing = lensRefs.rings.current[i];
        if (lensRing) lensRing.setAttribute('transform', ringTransform);
        // The wash twin: opacity only (fill is CSS — the theme glide owns
        // it), written only on real change so idle frames skip the DOM.
        const w = L.inert ? 0 : W.pulse.washMax * Math.min(1, wash[i]);
        if (w !== st.washPrev[i] && (Math.abs(w - st.washPrev[i]) > 0.003 || w === 0)) {
          st.washPrev[i] = w;
          const o = w.toFixed(3);
          const washEl = wavesRefs.washes.current[i];
          if (washEl) washEl.setAttribute('opacity', o);
          const lensWash = lensRefs.washes.current[i];
          if (lensWash) lensWash.setAttribute('opacity', o);
        }
      }

      // The writing-light advances over the stone (virtual clock — the
      // sweep and its candle stretch with the dial).
      writeEngraveFrame(st.vnow);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [booted, writeEngraveFrame, skyRefs.sun, skyRefs.moon, skyRefs.sunHalo, skyRefs.moonHalo, skyRefs.drift, tabletRefs.drift, tabletRefs.dip, tabletRefs.aura, tabletRefs.sheen, wavesRefs.rings, wavesRefs.washes, wavesRefs.radii, lensRefs.rings, lensRefs.washes, raysRef]);

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

  // ── ORACLE — AUTO: left alone, the tablet speaks again on its own ──────────
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
