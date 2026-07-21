'use client';

// The TRIGGER — the app's hero control: a wide pill of REAL liquid glass.
// Deliberately the ONE object that does not wear the world's palette as
// paint — instead it holds a pixel-aligned windowed COPY of the wave field
// (same seed, same geometry, driven by the same engine) and bends it with a
// true feDisplacementMap lens (lib/lens.ts, the glass-demo technique): the
// backdrop visibly refracts at the rim, crests and ripples warp as they
// pass beneath. Above the bent scene: a whisper of tint, a hairline uneven
// rim (never a solid border), a slim top gloss, a bottom glint, mirrored
// cap streaks. No label — the nested pyramid of the Emerald Tablet cover
// says what words would cheapen. The press is a major moment: it fires
// IMMEDIATELY (pointerdown, never click), sinks like pressed glass, DEEPENS
// THE LENS (cheap-path setStrength), blooms a refraction flash from the
// touch point, casts a shock ring — and, via the orchestrator, launches the
// ripple that races the whole field from HERE up into the body's rays.
// Release settles on the stage's one rationed jelly-bounce. The global
// keyboard path (Enter/Space anywhere) drives the same physics.

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { animate } from 'motion';
import { Lens, lensSupported } from '@/lib/lens';
import { KEY_RELEASE } from '@/lib/motion';
import { TABLET } from '@/lib/tablet';
import { buildWaveRings } from './Waves';

export interface TriggerKeyHandle {
  press: () => void;
  release: () => void;
}

/** Refs the engine writes: the key's windowed copy of the field. */
export interface LensRefs {
  svg: RefObject<SVGSVGElement | null>;
  rings: RefObject<(SVGPathElement | null)[]>;
  pulses: RefObject<(SVGGElement | null)[]>;
}

/** The emblem: an equilateral triangle, its exact incircle, and the
    triangle inscribed in THAT — the cover's nesting, three strokes. */
function Emblem() {
  return (
    <svg className="key-emblem" viewBox="0 0 32 32" aria-hidden="true">
      <g fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M 16 3.5 L 26.83 22.25 L 5.17 22.25 Z" />
        <circle cx="16" cy="16" r="6.25" />
        <path d="M 16 9.75 L 21.41 19.13 L 10.59 19.13 Z" />
      </g>
    </svg>
  );
}

export const TriggerKey = forwardRef<
  TriggerKeyHandle,
  { seed: string; lensRefs: LensRefs; onFire: () => void }
>(function TriggerKey({ seed, lensRefs, onFire }, handle) {
  const keyRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<HTMLSpanElement>(null);
  const bloomRef = useRef<HTMLSpanElement>(null);
  const shockRef = useRef<HTMLSpanElement>(null);
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  const lens = useRef<Lens | null>(null);
  // Once the user presses, the press itself repaints the key — pending
  // first-paint heal kicks become no-ops (avoids any overlap with the
  // press's own transform animation).
  const interacted = useRef(false);

  // Same seed, same pure generator, same sea — the copy is identical to
  // the field behind the key, so at rest the seam is invisible.
  const rings = useMemo(() => buildWaveRings(seed), [seed]);

  useLayoutEffect(() => {
    const key = keyRef.current;
    const bleed = sceneRef.current;
    if (!key || !bleed) return;
    // Bisect probes for first-load raster debugging (?probe=filter |
    // noclip) — stamped here, pre-paint, so the probed condition exists
    // at the very first raster like a stylesheet rule would.
    const probe = new URLSearchParams(window.location.search).get('probe');
    if (probe) key.dataset.probe = probe;
    // WebKit half-rasterizes a CSS-filtered element whose content is a
    // live-animated inline SVG on first paint — ANY filter, the function
    // grade included, not just the url() lens. There the bleed carries no
    // filter at all: the copy stays pixel-aligned with the field behind
    // it (seamless) and the painted .key-grade veil carries the glass
    // body. The bend is a progressive enhancement.
    if (!lensSupported()) {
      key.dataset.lens = 'flat';
      return;
    }
    key.dataset.lens = 'bent';
    const L = TABLET.key.lens;
    lens.current = new Lens(bleed, {
      depth: L.depth,
      strength: L.strength,
      chroma: L.chroma,
      pad: L.bleedPx,
      post: 'brightness(1.06) saturate(0.92)',
    });
    return () => {
      lens.current?.destroy();
      lens.current = null;
    };
  }, []);

  // First-paint raster heal. iOS WebKit rasterizes the clipped SVG copy
  // HALF-BAKED on first paint (one half shows the field, the other the bare
  // --wave-edge) and caches that tile until a compositing invalidation
  // repaints it — historically the user's first press, which transforms the
  // key. The engine has been writing correct geometry to the copy every
  // frame the whole time; nothing is wrong but the cached tile. So we force
  // that invalidation ourselves, a few times, once layout + fonts + the
  // lens-window viewBox (synced by the orchestrator at boot and ~950ms) have
  // settled: toggling a compositing layer on the clipped container drops and
  // re-rasterizes exactly that tile with its now-ready content. Invisible
  // where the bug doesn't occur — a no-op repaint ~1s in.
  //   ?fix=nokick — disable (baseline A/B)   ?fix=layer — leave the layer
  //   promoted instead of toggling           ?debug — on-device state readout
  useLayoutEffect(() => {
    const key = keyRef.current;
    const scene = key?.querySelector<HTMLElement>('.key-scene');
    if (!key || !scene) return;
    const params = new URLSearchParams(window.location.search);
    const fix = params.get('fix'); // null | 'nokick' | 'layer'
    const debug = params.get('debug') !== null;
    let kicks = 0;

    const paintDebug = () => {
      if (!debug) return;
      let box = document.getElementById('key-debug');
      if (!box) {
        box = document.createElement('div');
        box.id = 'key-debug';
        box.style.cssText =
          'position:fixed;top:8px;left:8px;z-index:9999;max-width:92vw;' +
          'font:11px/1.35 ui-monospace,monospace;color:#fff;white-space:pre-wrap;' +
          'background:rgba(0,0,0,.72);padding:6px 8px;border-radius:6px;pointer-events:none;';
        document.body.appendChild(box);
      }
      const bleed = key.querySelector<HTMLElement>('.key-bleed');
      const grade = key.querySelector<HTMLElement>('.key-grade');
      box.textContent = [
        `sup=${lensSupported()} lens=${key.dataset.lens ?? '-'} probe=${key.dataset.probe ?? '-'} fix=${fix ?? '-'}`,
        `filter=${bleed ? getComputedStyle(bleed).filter : '-'}`,
        `grade=${grade ? getComputedStyle(grade).opacity : '-'} kicks=${kicks} defsFilters=${document.querySelectorAll('body>svg filter').length}`,
        `ua=${navigator.userAgent}`,
      ].join('\n');
    };

    let raf = 0;
    const kick = () => {
      if (interacted.current) return; // a press already repainted the key
      // Transform the KEY itself — the exact element the healing press
      // transforms — so its clipped SVG child repaints in-layer, not on a
      // freshly-promoted layer of its own. translateZ(0) is visually
      // identity: the change repaints, the value moves nothing. The drop
      // (next frame) leaves the post-press state. ?fix=layer keeps it on.
      key.style.transform = 'translateZ(0)';
      void key.offsetHeight; // flush the style/layout change
      kicks += 1;
      if (fix === 'layer') {
        paintDebug();
        return;
      }
      raf = requestAnimationFrame(() => {
        key.style.transform = '';
        paintDebug();
      });
    };

    const timers =
      fix === 'nokick' ? [] : [220, 620, 1080].map((ms) => window.setTimeout(kick, ms));
    paintDebug();

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(raf);
      key.style.transform = '';
      document.getElementById('key-debug')?.remove();
    };
  }, []);

  function press(atX?: number, atY?: number) {
    const key = keyRef.current;
    if (!key) return;
    interacted.current = true;
    anim.current?.stop();
    key.dataset.pressed = 'true';
    // Explicit from→to keyframes: letting WAAPI read the "current" transform
    // string mis-parses it and tweens up from ~scale(0) — a two-frame
    // half-size flash on every press. The worst interruption snap between
    // these fixed poses is ~1.5%, invisible; the flash was not.
    anim.current = animate(
      key,
      {
        transform: [
          'translateY(0px) scale(1)',
          `translateY(${TABLET.key.travelPx}px) scale(0.965)`,
        ],
      },
      { duration: TABLET.key.pressMs / 1000, ease: 'easeOut' },
    );
    // The glass compresses: the bend deepens (cheap path — attributes only).
    lens.current?.setStrength(TABLET.key.lens.strength * TABLET.key.lens.pressBoost);
    const bloom = bloomRef.current;
    if (bloom) {
      key.style.setProperty('--press-x', atX === undefined ? '50%' : `${atX}px`);
      key.style.setProperty('--press-y', atY === undefined ? '50%' : `${atY}px`);
      bloom.dataset.bloom = 'false';
      void bloom.offsetWidth; // restart the bloom animation
      bloom.dataset.bloom = 'true';
    }
    const shock = shockRef.current;
    if (shock) {
      shock.dataset.bloom = 'false';
      void shock.offsetWidth;
      shock.dataset.bloom = 'true';
    }
  }

  function release() {
    const key = keyRef.current;
    if (!key) return;
    anim.current?.stop();
    key.dataset.pressed = 'false';
    lens.current?.setStrength(TABLET.key.lens.strength);
    // The one bounce on stage: glass settling like liquid (explicit
    // keyframes for the same reason as the press).
    anim.current = animate(
      key,
      {
        transform: [
          `translateY(${TABLET.key.travelPx}px) scale(0.965)`,
          'translateY(0px) scale(1)',
        ],
      },
      KEY_RELEASE,
    );
  }

  useImperativeHandle(handle, () => ({ press: () => press(), release }));

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests, capture scripts) have no live pointerId.
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
    press(x, y);
    onFire();
  }

  return (
    <button
      ref={keyRef}
      type="button"
      className="glass-key"
      data-pressed="false"
      aria-label="Trigger — the tablet answers"
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onKeyDown={(e) => {
        // The global handler owns Enter/Space so the physics can't
        // double-fire; swallow the native button activation.
        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
      }}
    >
      {/* The bent scene: a windowed copy of the field, engine-driven, under
          the real lens. The copy BLEEDS past the pill (the filter lives on
          the bleed layer; this span clips the result) so rim displacement
          always samples painted field. viewBox is synced by the
          orchestrator over the bleed's rect. */}
      <span className="key-scene" aria-hidden="true">
        <span
          ref={sceneRef}
          className="key-bleed"
          style={{ inset: `${-TABLET.key.lens.bleedPx}px` }}
        >
          <svg ref={lensRefs.svg} className="key-scene-svg" viewBox="456 876 288 132">
          <g transform="translate(600 600)">
            {[...rings].reverse().map((ring, rev) => {
              const i = rings.length - 1 - rev;
              return (
                <path
                  key={i}
                  ref={(el) => {
                    lensRefs.rings.current[i] = el;
                  }}
                  d={ring.d}
                  className="wave-ring"
                  style={{
                    fill: `color-mix(in oklab, var(--wave-root) ${ring.mix}%, var(--wave-edge))`,
                  }}
                />
              );
            })}
            {Array.from({ length: TABLET.waves.pulse.pool }, (_, p) => (
              <g
                key={p}
                ref={(el) => {
                  lensRefs.pulses.current[p] = el;
                }}
                opacity={0}
              >
                <circle
                  r={TABLET.waves.innerRadius * 0.9}
                  className="wave-pulse wave-pulse-echo"
                  vectorEffect="non-scaling-stroke"
                  opacity={TABLET.waves.pulse.echoOpacity}
                />
                <circle
                  r={TABLET.waves.innerRadius}
                  className="wave-pulse"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
          </svg>
        </span>
        {/* Flat-glass grade veil — visible only under data-lens='flat',
            where it replaces the filter chain's brightness/saturate. */}
        <span className="key-grade" />
      </span>
      <span className="key-tint" aria-hidden="true" />
      <span className="key-rim" aria-hidden="true" />
      <span className="key-gloss" aria-hidden="true" />
      <span className="key-glint" aria-hidden="true" />
      <span className="key-caps" aria-hidden="true" />
      <span ref={shockRef} className="key-shock" data-bloom="false" aria-hidden="true" />
      <span ref={bloomRef} className="key-bloom" data-bloom="false" aria-hidden="true" />
      <Emblem />
    </button>
  );
});
