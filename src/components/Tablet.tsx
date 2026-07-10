'use client';

// The Emerald Tablet — the hero. A rounded stone-edged slab whose face is a
// phosphor screen in the tradition of the terminal photo: scanline texture,
// glow bleed, glyph lines. At idle it shows drifting pseudo-glyphs (seeded
// procedural marks, not a real script); on TRIGGER the engine scrambles them
// into a fact. This component supplies structure and the idle script; the
// one rAF loop (AsAboveApp) owns every animated attribute via these refs.
// Channel discipline — one writer per element:
//   .tablet-drift  — engine: levitation (bob + sway + tilt)
//     .tablet-dip  — engine: decode suspension dip (spring)
//       .tablet-aura   — engine: glow breathing + swell (opacity)
//       .tablet-screen — Motion: FLIP height growth only
//         text blocks  — engine: decode textContent

import { useMemo, type RefObject } from 'react';
import type { Fact } from '@/data/facts';
import { seededRng } from '@/lib/rand';

export interface TabletRefs {
  drift: RefObject<HTMLDivElement | null>;
  dip: RefObject<HTMLDivElement | null>;
  aura: RefObject<HTMLDivElement | null>;
  screen: RefObject<HTMLDivElement | null>;
  textWrap: RefObject<HTMLDivElement | null>;
  claim: RefObject<HTMLParagraphElement | null>;
  lore: RefObject<HTMLParagraphElement | null>;
  filed: RefObject<HTMLParagraphElement | null>;
}

/** One idle pseudo-glyph: 1–3 short wedge/bar/hook strokes. */
function glyphPath(rng: () => number, x: number, y: number): string {
  const marks = 1 + Math.floor(rng() * 3);
  let d = '';
  for (let m = 0; m < marks; m += 1) {
    const gx = x + m * 9 + rng() * 3;
    const gy = y + (rng() - 0.5) * 6;
    const kind = rng();
    if (kind < 0.4) {
      d += `M ${gx} ${gy} l 6.5 ${1.5 + rng() * 2} l -2.5 ${3.5 + rng() * 2} `; // wedge
    } else if (kind < 0.7) {
      d += `M ${gx} ${gy + 3} l ${7 + rng() * 3} 0 `; // bar
    } else {
      d += `M ${gx} ${gy} q ${4 + rng() * 2} 1 ${3.5 + rng()} ${5 + rng() * 2} `; // hook
    }
  }
  return d;
}

export function Tablet({
  refs,
  seed,
  hasFact,
  fact,
  showHint,
  onTap,
}: {
  refs: TabletRefs;
  seed: string;
  hasFact: boolean;
  /** The settled fact — read by assistive tech, not by the boiling screen. */
  fact: Fact | null;
  /** The one line of first-load copy, retired after the first press. */
  showHint: boolean;
  onTap: () => void;
}) {
  const glyphs = useMemo(() => {
    const rng = seededRng(`${seed}:glyphs`);
    const rows: { d: string; cls: string; delay: number }[] = [];
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 6; c += 1) {
        if (rng() < 0.18) continue; // missing entries — the script breathes
        rows.push({
          d: glyphPath(rng, 14 + c * 42, 20 + r * 38),
          cls: ['g-tw-a', 'g-tw-b', 'g-tw-c'][Math.floor(rng() * 3)],
          delay: -rng() * 13,
        });
      }
    }
    return rows;
  }, [seed]);

  return (
    <div className="tablet-root">
      <div ref={refs.drift} className="tablet-drift">
        <div ref={refs.dip} className="tablet-dip">
          <div ref={refs.aura} className="tablet-aura" aria-hidden="true" />
          <div
            className="tablet-slab"
            onPointerDown={(e) => {
              // Tapping the tablet itself also asks it to speak.
              if (e.button === 0 || e.pointerType !== 'mouse') onTap();
            }}
          >
            <div className="tablet-bezel">
              <div ref={refs.screen} className="tablet-screen">
                <svg
                  className="tablet-glyphs"
                  viewBox="0 0 260 320"
                  preserveAspectRatio="xMidYMid slice"
                  data-visible={!hasFact}
                  aria-hidden="true"
                >
                  <g fill="none" strokeLinecap="round" strokeWidth={1.5}>
                    {glyphs.map((g, i) => (
                      <path
                        key={i}
                        d={g.d}
                        className={g.cls}
                        style={{ animationDelay: `${g.delay}s` }}
                      />
                    ))}
                  </g>
                </svg>
                <div
                  ref={refs.textWrap}
                  className="tablet-text"
                  data-visible={hasFact}
                  aria-hidden="true"
                >
                  <p ref={refs.claim} className="fact-claim" />
                  <p ref={refs.lore} className="fact-lore" />
                  <p ref={refs.filed} className="fact-filed" />
                </div>
                <p className="tablet-hint" data-visible={showHint && !hasFact}>
                  press the key — the tablet answers
                </p>
                <div className="tablet-scan" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* The tablet speaks to assistive tech once per settled fact, without
          the per-frame boil. */}
      <div className="sr-only" role="status" aria-live="polite">
        {fact ? `${fact.claim} ${fact.lore} Filed under: ${fact.filedUnder}` : ''}
      </div>
    </div>
  );
}
