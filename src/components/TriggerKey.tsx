'use client';

// The TRIGGER — the app's hero control. CURRENT FINISH (this branch):
// 'frost' — the console's themed liquid glass promoted to the trigger
// (see keyFinish below for why the clear pill retired; ?key=smoke and
// ?key=glass switch finishes). The clear/lens path below remains fully wired:
// a wide pill of REAL liquid glass,
// deliberately the ONE object that does not wear the world's palette as
// paint — instead it holds a pixel-aligned windowed COPY of the wave field
// (same seed, same geometry, driven by the same engine) and bends it with a
// true feDisplacementMap lens (lib/lens.ts, the glass-demo technique): the
// backdrop visibly refracts at the rim, crests and ripples warp as they
// pass beneath. On WebKit, where that raster path is unreliable, the copy
// is removed and the glass becomes a transparent window onto the real
// field. Above the scene: a whisper of tint, a hairline uneven rim (never a
// solid border), a slim top gloss, a bottom glint, mirrored cap streaks.
// The pill carries SO BELOW in the display voice — the poster's answering
// line, not a label (see KeyCopy). The press is a major moment: it fires
// IMMEDIATELY (pointerdown, never click), sinks like pressed glass, DEEPENS
// THE LENS (cheap-path setStrength) — and, via the orchestrator, the SKY
// answers: the ripple is born at the body and cascades down through the
// whole field, warping under this glass as it passes. The key itself stays
// quiet — no local flash or ring competes with the sky's reply.
// Release settles on the stage's one rationed jelly-bounce. The global
// keyboard path (Enter/Space anywhere) drives the same physics.

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
  rings: RefObject<(SVGGElement | null)[]>;
  washes: RefObject<(SVGPathElement | null)[]>;
}

type LensMode = 'pending' | 'flat' | 'bent';

type KeyFinish = 'frost' | 'smoke' | 'glass';

/** The key's finish — the live experiment; THIS BRANCH defaults to
    'frost': the console's own themed liquid glass (--glass-tint +
    backdrop blur, the material the chips wear), promoted to the trigger —
    the poster's word ghosts through a light frosted pane instead of the
    smoke branch's dark one. The clear pill retired either way: the
    Chromium lens bends a copy of the WAVE FIELD only, so glass over the
    lettering showed waves without the word, and a clear pill dissolves
    against giant cream letters. '?key=smoke' / '?key=glass' switch
    finishes for A/B comparison. */
function keyFinish(): KeyFinish {
  if (typeof window === 'undefined') return 'frost';
  const k = new URLSearchParams(window.location.search).get('key');
  return k === 'glass' || k === 'smoke' ? k : 'frost';
}

/** The key's copy: the other half of the poster's sentence. AS ABOVE
    fills the sky in the display voice; the key in the thumb zone answers
    SO BELOW in a miniature of the same voice — not a label (a label would
    cheapen it; "TRIGGER" was never considered), the completion of the
    line. Pressing it literally makes above answer below. (This replaced
    the nested-pyramid emblem — the sentence beats the sigil.) */
function KeyCopy() {
  return (
    <span className="key-copy" aria-hidden="true">
      SO BELOW
    </span>
  );
}

export const TriggerKey = forwardRef<
  TriggerKeyHandle,
  { seed: string; lensRefs: LensRefs; onFire: () => void }
>(function TriggerKey({ seed, lensRefs, onFire }, handle) {
  const keyRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<HTMLSpanElement>(null);
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  const lens = useRef<Lens | null>(null);
  const [lensMode, setLensMode] = useState<LensMode>('pending');
  // Client-only component (the app renders after boot), so the param read
  // is safe at first render — the smoke pill never flashes clear.
  const [finish] = useState<KeyFinish>(() => keyFinish());

  // Same seed, same pure generator, same sea — the copy is identical to
  // the field behind the key, so at rest the seam is invisible.
  const rings = useMemo(() => buildWaveRings(seed), [seed]);

  useLayoutEffect(() => {
    // Decide before the browser's first paint of this client-only scene.
    // Until then the copy is not mounted, so production's single effect pass
    // cannot expose WebKit to even one raster of the fragile inline SVG.
    // The smoke finish never mounts the copy at all — the pill is a pane,
    // not a window, so there is nothing to duplicate or bend.
    setLensMode(finish === 'glass' && lensSupported() ? 'bent' : 'flat');
  }, [finish]);

  useLayoutEffect(() => {
    if (lensMode !== 'bent') return;
    const bleed = sceneRef.current;
    if (!bleed) return;
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
  }, [lensMode]);

  function press() {
    const key = keyRef.current;
    if (!key) return;
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

  useImperativeHandle(handle, () => ({ press, release }));

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointers (tests, capture scripts) have no live pointerId.
    }
    press();
    onFire();
  }

  return (
    <button
      ref={keyRef}
      type="button"
      className="glass-key"
      data-lens={lensMode}
      data-finish={finish}
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
      {lensMode === 'bent' && (
        <span className="key-scene" aria-hidden="true">
          {/* The bent scene is mounted only after Chromium support is known.
              The copy BLEEDS past the pill so rim displacement always samples
              painted field; the orchestrator syncs its viewBox to this rect. */}
          <span
            ref={sceneRef}
            className="key-bleed"
            style={{ inset: `${-TABLET.key.lens.bleedPx}px` }}
          >
            <svg
              ref={lensRefs.svg}
              className="key-scene-svg"
              viewBox="456 876 288 132"
              preserveAspectRatio="none"
            >
              <g transform="translate(600 600)">
                {[...rings].reverse().map((ring, rev) => {
                  const i = rings.length - 1 - rev;
                  return (
                    <g
                      key={i}
                      ref={(el) => {
                        lensRefs.rings.current[i] = el;
                      }}
                    >
                      <path
                        d={ring.d}
                        className="wave-ring"
                        style={{
                          fill: `color-mix(in oklab, var(--wave-root) ${ring.mix}%, var(--wave-edge))`,
                        }}
                      />
                      <path
                        d={ring.d}
                        className="wave-wash"
                        opacity={0}
                        ref={(el) => {
                          lensRefs.washes.current[i] = el;
                        }}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
          </span>
        </span>
      )}
      {/* Flat-glass grade veil — WebKit never mounts .key-scene at all. */}
      <span className="key-grade" aria-hidden="true" />
      <span className="key-tint" aria-hidden="true" />
      <span className="key-rim" aria-hidden="true" />
      <span className="key-gloss" aria-hidden="true" />
      <span className="key-glint" aria-hidden="true" />
      <span className="key-caps" aria-hidden="true" />
      <KeyCopy />
    </button>
  );
});
