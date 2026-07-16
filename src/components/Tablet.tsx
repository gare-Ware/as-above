'use client';

// The Emerald Tablet — the hero. A cut gem now, not a panel: a chamfered,
// seeded-irregular silhouette whose bevel band catches the sky, a deep
// emerald face with light living inside it, and pale-jade lettering ENGRAVED
// into the stone (a decode lifts the letters into luminescence — see
// globals.css [data-decode='decoding']). At idle the face carries drifting
// pseudo-glyphs (seeded marks, not a real script). This component supplies
// structure and the idle script; the one rAF loop (AsAboveApp) owns every
// animated attribute via these refs. Channel discipline — one writer per
// element:
//   .tablet-drift  — engine: levitation (bob + sway + tilt)
//     .tablet-dip  — engine: decode suspension dip (spring)
//       .tablet-aura  — engine: glow breathing + swell (opacity)
//       .tablet-face  — Motion: FLIP height growth only
//         .tablet-sheen — engine: specular slide (rides the float tilt)
//         text blocks   — engine: decode textContent

import { useMemo, type CSSProperties, type RefObject } from 'react';
import type { Fact } from '@/data/facts';
import { seededRng } from '@/lib/rand';

export interface TabletRefs {
  drift: RefObject<HTMLDivElement | null>;
  dip: RefObject<HTMLDivElement | null>;
  aura: RefObject<HTMLDivElement | null>;
  screen: RefObject<HTMLDivElement | null>;
  sheen: RefObject<HTMLDivElement | null>;
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
  /** The settled fact — read by assistive tech, not by the boiling face. */
  fact: Fact | null;
  /** The one line of first-load copy, retired after the first press. */
  showHint: boolean;
  onTap: () => void;
}) {
  const art = useMemo(() => {
    const rng = seededRng(`${seed}:gem`);

    // The cut: a chamfered octagon, each corner and edge slightly its own —
    // a stone that was worked, not stamped. Same polygon clips gem and face
    // (percentages adapt to each box).
    const c = () => 5.5 + rng() * 4; // corner chamfer, %
    const e = () => rng() * 0.9; // edge shy of true, %
    const pts: [number, number][] = [
      [c(), e()],
      [100 - c(), e()],
      [100 - e(), c()],
      [100 - e(), 100 - c()],
      [100 - c(), 100 - e()],
      [c(), 100 - e()],
      [e(), 100 - c()],
      [e(), c()],
    ];
    const cut = pts.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(', ');

    // Light living inside the stone: two inclusion blobs, placed per session.
    const inclusionA: CSSProperties = {
      left: `${8 + rng() * 18}%`,
      top: `${6 + rng() * 20}%`,
      width: `${38 + rng() * 16}%`,
      height: `${30 + rng() * 14}%`,
    };
    const inclusionB: CSSProperties = {
      right: `${4 + rng() * 16}%`,
      bottom: `${8 + rng() * 18}%`,
      width: `${30 + rng() * 16}%`,
      height: `${24 + rng() * 12}%`,
    };

    const glyphRng = seededRng(`${seed}:glyphs`);
    const glyphs: { d: string; cls: string; delay: number }[] = [];
    for (let r = 0; r < 8; r += 1) {
      for (let col = 0; col < 6; col += 1) {
        if (glyphRng() < 0.18) continue; // missing entries — the script breathes
        glyphs.push({
          d: glyphPath(glyphRng, 14 + col * 42, 20 + r * 38),
          cls: ['g-tw-a', 'g-tw-b', 'g-tw-c'][Math.floor(glyphRng() * 3)],
          delay: -glyphRng() * 13,
        });
      }
    }
    return { cut, inclusionA, inclusionB, glyphs };
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
            <div className="tablet-gem" style={{ clipPath: `polygon(${art.cut})` }}>
              <div
                ref={refs.screen}
                className="tablet-face"
                style={{ clipPath: `polygon(${art.cut})` }}
              >
                <span
                  className="gem-inclusion gem-inclusion-a"
                  style={art.inclusionA}
                  aria-hidden="true"
                />
                <span
                  className="gem-inclusion gem-inclusion-b"
                  style={art.inclusionB}
                  aria-hidden="true"
                />
                <div ref={refs.sheen} className="tablet-sheen" aria-hidden="true" />
                <svg
                  className="tablet-glyphs"
                  viewBox="0 0 260 320"
                  preserveAspectRatio="xMidYMid slice"
                  data-visible={!hasFact}
                  aria-hidden="true"
                >
                  <g fill="none" strokeLinecap="round" strokeWidth={1.6}>
                    {art.glyphs.map((g, i) => (
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
