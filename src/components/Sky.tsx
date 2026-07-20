'use client';

// The body above — sun or moon, PREMIUM-QUIET: no outlines, no surface
// doodles. The sun is a pure luminous disc (a white-hot core dissolving into
// the gold), the moon a bare pearl with soft limb shading and slow fog veils
// drifting across it (the veils are CSS-owned ambient, gated like all
// dressing). Both bodies share one center; the engine drives the
// eclipse-adjacent swap, the almost-imperceptible drift, the halo breathing,
// and the ripple's arrival flare. Geometry only — every animated attribute
// is written by the engine via refs.

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
        <filter id="sky-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* The sun's living center: white heat easing into the disc color. */}
        <radialGradient id="sun-core">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.92)" />
          <stop offset="42%" stopColor="rgba(255, 255, 255, 0.30)" />
          <stop offset="74%" stopColor="rgba(255, 255, 255, 0.05)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
        {/* Limb shading: the pearl darkens a breath at its rim — depth
            without a drawn edge. */}
        <radialGradient id="moon-limb">
          <stop offset="0%" stopColor="rgba(96, 118, 176, 0)" />
          <stop offset="64%" stopColor="rgba(96, 118, 176, 0)" />
          <stop offset="88%" stopColor="rgba(96, 118, 176, 0.10)" />
          <stop offset="100%" stopColor="rgba(70, 92, 150, 0.26)" />
        </radialGradient>
        <clipPath id="moon-clip">
          <circle cx={C} cy={C} r={84} />
        </clipPath>
      </defs>
      <g ref={refs.drift}>
        {/* ── SUN: halo, disc, luminous core — nothing else ── */}
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
          <circle cx={C} cy={C} r={88} fill="url(#sun-core)" />
        </g>

        {/* ── MOON: halo, bare pearl, limb shading, drifting fog veils ── */}
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
          <circle cx={C} cy={C} r={84} fill="url(#moon-limb)" />
          {/* The veils cross the UPPER dome — the part of the pearl the
              tablet never hides. */}
          <g clipPath="url(#moon-clip)" filter="url(#sky-soft)">
            <ellipse
              className="moon-fog moon-fog-a"
              cx={C - 24}
              cy={C - 44}
              rx={96}
              ry={22}
              fill="rgba(134, 156, 205, 0.38)"
            />
            <ellipse
              className="moon-fog moon-fog-b"
              cx={C + 34}
              cy={C - 10}
              rx={104}
              ry={26}
              fill="rgba(120, 143, 196, 0.3)"
            />
            <ellipse
              className="moon-fog moon-fog-c"
              cx={C - 6}
              cy={C - 28}
              rx={88}
              ry={11}
              fill="rgba(255, 255, 255, 0.6)"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
