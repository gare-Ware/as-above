'use client';

// The Emerald Tablet — the hero. A river-worn slab of emerald: perfectly
// symmetric, rounded (no hard edges anywhere on a major element), a bevel
// crown catching the sky along its top, a deep emerald face with light
// living inside it, and pale-jade lettering ENGRAVED into the stone. A fire
// runs the magical engraving (lib/engrave.ts): one downward pass with two
// edges — the erase edge lifts the OUTGOING text away (visible below it)
// while the write edge follows a breath behind, landing the INCOMING text
// (visible above it). Four aligned layers carry this: outgoing carved +
// gold twin, incoming carved + gold twin, all identical typography so they
// wrap identically, masked via the --edge-in/--edge-out/--cap-out/--lit
// vars the engine writes on .tablet-text (mask shapes live in globals.css).
// At idle the face carries
// drifting pseudo-glyphs (seeded marks, not a real script). This component
// supplies structure and the idle script; the one rAF loop (AsAboveApp)
// owns every animated attribute via these refs. Channel discipline — one
// writer per element:
//   .tablet-drift  — engine: levitation (pure vertical bob — always plumb)
//     .tablet-dip  — engine: fire suspension dip (spring) + the breath's
//                    gulp squeeze (centered narrower-dominant scale)
//       .tablet-aura  — engine: glow breathing + swell (opacity)
//       .tablet-face  — Motion: FLIP height growth only
//         .tablet-sheen — engine: specular wander (its own slow period)
//         .tablet-text  — engine: --edge-in/--edge-out/--cap-out/--lit
//                         (the writing-light's two edges)
//         text blocks   — engine: textContent (each pair written together,
//                         only at fire time)

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
  /** The gold lit twins — identical text/typography, so the layers wrap
      identically and the writing-light overlays letter-for-letter. */
  claimLit: RefObject<HTMLParagraphElement | null>;
  loreLit: RefObject<HTMLParagraphElement | null>;
  filedLit: RefObject<HTMLParagraphElement | null>;
  /** The outgoing pair — holds the PREVIOUS fact while the erase edge
      lifts it away beneath the incoming write. */
  outWrap: RefObject<HTMLDivElement | null>;
  outLitWrap: RefObject<HTMLDivElement | null>;
  claimOut: RefObject<HTMLParagraphElement | null>;
  loreOut: RefObject<HTMLParagraphElement | null>;
  filedOut: RefObject<HTMLParagraphElement | null>;
  claimOutLit: RefObject<HTMLParagraphElement | null>;
  loreOutLit: RefObject<HTMLParagraphElement | null>;
  filedOutLit: RefObject<HTMLParagraphElement | null>;
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
  /** The settled fact — read by assistive tech, not by the sweeping face. */
  fact: Fact | null;
  /** The one line of first-load copy, retired after the first press. */
  showHint: boolean;
  onTap: () => void;
}) {
  const art = useMemo(() => {
    const rng = seededRng(`${seed}:gem`);

    // The silhouette is pure CSS now (symmetric rounded slab + bevel crown —
    // no seeded cut: the stone is polished, not chipped). What stays seeded
    // is the light INSIDE it.
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
    return { inclusionA, inclusionB, glyphs };
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
            <div className="tablet-gem">
              <div ref={refs.screen} className="tablet-face">
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
                  {/* The outgoing fact: visible below the erase edge, its
                      gold twin igniting the letters the moment before they
                      lift away. The engine gives both an explicit height at
                      fire (old text can be taller than the new flow). */}
                  <div ref={refs.outWrap} className="engrave-out">
                    <p ref={refs.claimOut} className="fact-claim-out" />
                    <p ref={refs.loreOut} className="fact-lore-out" />
                    <p ref={refs.filedOut} className="fact-filed-out" />
                  </div>
                  <div ref={refs.outLitWrap} className="engrave-out-lit">
                    <p ref={refs.claimOutLit} className="fact-claim-out-lit" />
                    <p ref={refs.loreOutLit} className="fact-lore-out-lit" />
                    <p ref={refs.filedOutLit} className="fact-filed-out-lit" />
                  </div>
                  {/* The incoming fact: visible above the write edge, its
                      gold twin the band where the light is writing. Distinct
                      classnames per layer on purpose — .fact-* selectors
                      (tests, a11y) must keep matching exactly one node. */}
                  <div className="engrave-base">
                    <p ref={refs.claim} className="fact-claim" />
                    <p ref={refs.lore} className="fact-lore" />
                    <p ref={refs.filed} className="fact-filed" />
                  </div>
                  <div className="engrave-lit">
                    <p ref={refs.claimLit} className="fact-claim-lit" />
                    <p ref={refs.loreLit} className="fact-lore-lit" />
                    <p ref={refs.filedLit} className="fact-filed-lit" />
                  </div>
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
          the per-frame sweep. */}
      <div className="sr-only" role="status" aria-live="polite">
        {fact ? `${fact.claim} ${fact.lore} Filed under: ${fact.filedUnder}` : ''}
      </div>
    </div>
  );
}
