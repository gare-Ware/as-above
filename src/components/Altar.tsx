'use client';

// The altar — an earthen pedestal, the ONLY still thing on stage: the anchor
// everything else moves against. Layered strata with seeded rough edges, and
// along the face a suggestion of the photo's carved heads rendered as
// abstract profile line-motifs (repeated stroke glyphs, deliberately not
// figurative). The engine's single write here is the tablet's hover shadow.

import { useMemo, type RefObject } from 'react';
import { seededRng } from '@/lib/rand';

const W = 440;

/** A rough horizontal edge: y wobbles a little as it crosses. */
function roughEdge(
  rng: () => number,
  x0: number,
  x1: number,
  y: number,
  wobble: number,
): string {
  const steps = 9;
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const yy = y + (rng() - 0.5) * wobble;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yy.toFixed(1)} `;
  }
  return d;
}

/** One band of stone: rough top edge, straight sides and bottom. */
function band(rng: () => number, x0: number, x1: number, yTop: number, yBot: number): string {
  return `${roughEdge(rng, x0, x1, yTop, 4)} L ${x1} ${yBot} L ${x0} ${yBot} Z`;
}

// One abstract profile: forehead → brow notch → nose → lips → beard sweep.
// A stroke glyph in the photo's carved-head tradition, not a face.
const PROFILE =
  'M 0 0 c 3.5 1 5.5 4 4.5 8.5 l -1.5 2 l 3.5 2.5 l -3.5 2 q 3 1.5 2 3.5 l -2 2 q 4.5 2 3.5 6.5 c -1 5.5 -7 8.5 -13.5 9';

export function Altar({
  seed,
  shadowRef,
}: {
  seed: string;
  shadowRef: RefObject<SVGEllipseElement | null>;
}) {
  const art = useMemo(() => {
    const rng = seededRng(`${seed}:altar`);
    return {
      cap: band(rng, 44, 396, 14, 56),
      face: band(rng, 26, 414, 56, 130),
      base: band(rng, 8, 432, 130, 172),
      strata: [
        roughEdge(rng, 30, 410, 66, 2.5),
        roughEdge(rng, 30, 410, 120, 2.5),
        roughEdge(rng, 12, 428, 144, 3),
        roughEdge(rng, 12, 428, 158, 3),
      ],
      profiles: Array.from({ length: 7 }, (_, i) => ({
        x: 52 + i * 50 + (rng() - 0.5) * 4,
        y: 78 + (rng() - 0.5) * 4,
      })),
    };
  }, [seed]);

  return (
    <svg className="altar" viewBox={`0 0 ${W} 190`} aria-hidden="true">
      <defs>
        <filter id="altar-soft" x="-40%" y="-200%" width="180%" height="500%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={220} cy={176} rx={208} ry={9} className="altar-ground" filter="url(#altar-soft)" />

      {/* strata, base-first */}
      <path d={art.base} className="altar-base" />
      <path d={art.face} className="altar-face" />
      <path d={art.cap} className="altar-cap" />

      {/* fine strata lines */}
      <g className="altar-lines" fill="none" strokeWidth={1}>
        {art.strata.map((d, i) => (
          <path key={i} d={d} opacity={i < 2 ? 0.4 : 0.3} />
        ))}
      </g>

      {/* the carved profile motifs, marching across the face */}
      <g className="altar-carves" fill="none" strokeWidth={1.5} strokeLinecap="round">
        {art.profiles.map((p, i) => (
          <path key={i} d={PROFILE} transform={`translate(${p.x} ${p.y})`} opacity={0.55} />
        ))}
      </g>

      {/* top-surface light */}
      <path d={art.strata[0]} transform="translate(0 -47)" className="altar-light" fill="none" strokeWidth={1.2} opacity={0.35} />

      {/* the tablet's hover shadow — the engine's one write in this file */}
      <ellipse
        ref={shadowRef}
        cx={220}
        cy={22}
        rx={92}
        ry={7}
        className="altar-hover-shadow"
        filter="url(#altar-soft)"
        opacity={0.32}
      />
    </svg>
  );
}
