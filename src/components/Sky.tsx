'use client';

// The body above — sun or moon as a FILLED disc now: the wave field is its
// voice, so the body itself stays quiet and solid, with only a whisper of
// surface detail. Both bodies share one center; the engine drives the
// eclipse-adjacent swap (the leaving body sinks and recedes while the other
// rises through it), the almost-imperceptible drift, and the halo breathing.
// Geometry only — every animated attribute is written by the engine via refs.

import type { RefObject } from 'react';

export interface SkyRefs {
  drift: RefObject<SVGGElement | null>;
  sun: RefObject<SVGGElement | null>;
  moon: RefObject<SVGGElement | null>;
  sunHalo: RefObject<SVGCircleElement | null>;
  moonHalo: RefObject<SVGCircleElement | null>;
}

/** Shared center of the 240×240 box — the engine's swap math pivots here. */
export const SKY_CENTER = 120;
const C = SKY_CENTER;

export function Sky({ refs }: { refs: SkyRefs }) {
  return (
    <svg className="sky" viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <filter id="sky-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>
      <g ref={refs.drift}>
        {/* ── SUN: a solid gold disc with faint surface strokes ── */}
        <g ref={refs.sun}>
          <circle
            ref={refs.sunHalo}
            cx={C}
            cy={C}
            r={106}
            className="sky-halo"
            filter="url(#sky-blur)"
            opacity={0.42}
          />
          <circle cx={C} cy={C} r={88} className="sky-body" />
          <g className="sky-detail" fill="none" strokeWidth={2.2} strokeLinecap="round" opacity={0.4}>
            <path d={`M ${C - 52} ${C - 30} q 24 6 62 1 q 22 -3 40 2`} />
            <path d={`M ${C - 64} ${C - 2} q 34 8 76 2 q 26 -4 50 3`} />
            <path d={`M ${C - 58} ${C + 28} q 28 7 64 2 q 20 -3 44 2`} />
            <path d={`M ${C - 40} ${C + 54} q 22 5 48 1 q 14 -2 30 2`} />
          </g>
          <circle
            cx={C}
            cy={C}
            r={88}
            fill="none"
            stroke="rgba(255, 244, 214, 0.4)"
            strokeWidth={1.4}
          />
        </g>

        {/* ── MOON: a silver-green disc, craters, a breath of terminator ── */}
        <g ref={refs.moon}>
          <circle
            ref={refs.moonHalo}
            cx={C}
            cy={C}
            r={100}
            className="sky-halo"
            filter="url(#sky-blur)"
            opacity={0.36}
          />
          <circle cx={C} cy={C} r={84} className="sky-body" />
          <g className="sky-detail-fill" opacity={0.5}>
            <circle cx={C + 26} cy={C - 22} r={10} />
            <circle cx={C + 40} cy={C + 14} r={6} />
            <circle cx={C + 12} cy={C + 38} r={4.5} />
            <circle cx={C - 8} cy={C - 44} r={3.5} />
          </g>
          {/* the shaded limb — a quiet crescent of depth */}
          <path
            d={`M ${C} ${C - 84} A 84 84 0 0 0 ${C} ${C + 84} A 30 84 0 0 1 ${C} ${C - 84} Z`}
            fill="rgba(6, 22, 14, 0.14)"
          />
          <circle
            cx={C}
            cy={C}
            r={84}
            fill="none"
            stroke="rgba(240, 252, 242, 0.35)"
            strokeWidth={1.4}
          />
        </g>
      </g>
    </svg>
  );
}
