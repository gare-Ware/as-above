'use client';

// The body above — sun or moon, drawn in the line language: strokes and
// simple geometry, never detailed imagery. Both bodies are always mounted,
// sharing one center; the engine drives the eclipse-adjacent swap (the
// leaving body sinks and recedes while the other rises through it) plus the
// almost-imperceptible drift and the halo breathing. This component supplies
// geometry only; every animated attribute is written by the engine via refs.

import type { RefObject } from 'react';

export interface SkyRefs {
  drift: RefObject<SVGGElement | null>;
  sun: RefObject<SVGGElement | null>;
  moon: RefObject<SVGGElement | null>;
  sunHalo: RefObject<SVGCircleElement | null>;
  moonHalo: RefObject<SVGCircleElement | null>;
}

const C = 110; // shared center in the 220×220 box

function sunRays() {
  const rays: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI * 2) / 16 - Math.PI / 2;
    const r1 = 66;
    const r2 = i % 2 === 0 ? 82 : 74; // calibration ticks: long, short, long…
    rays.push({
      x1: C + r1 * Math.cos(a),
      y1: C + r1 * Math.sin(a),
      x2: C + r2 * Math.cos(a),
      y2: C + r2 * Math.sin(a),
    });
  }
  return rays;
}

export function Sky({ refs }: { refs: SkyRefs }) {
  return (
    <svg className="sky" viewBox="0 0 220 220" aria-hidden="true">
      <defs>
        <filter id="sky-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <g ref={refs.drift}>
        {/* ── SUN: concentric rings + calibration-tick rays ── */}
        <g ref={refs.sun}>
          <circle
            ref={refs.sunHalo}
            cx={C}
            cy={C}
            r={64}
            className="sky-halo"
            filter="url(#sky-blur)"
            opacity={0.4}
          />
          <g className="sky-line" fill="none" strokeLinecap="round">
            {sunRays().map((r, i) => (
              <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} strokeWidth={1.7} />
            ))}
            <circle cx={C} cy={C} r={56} strokeWidth={1.1} opacity={0.75} />
            <circle cx={C} cy={C} r={44} strokeWidth={0.9} opacity={0.45} />
            <circle cx={C} cy={C} r={30} strokeWidth={2.2} />
          </g>
          <circle cx={C} cy={C} r={22} className="sky-fill" opacity={0.16} />
          <circle cx={C} cy={C} r={2.6} className="sky-fill" />
        </g>

        {/* ── MOON: stroked disc, terminator, crater arcs ── */}
        <g ref={refs.moon}>
          <circle
            ref={refs.moonHalo}
            cx={C}
            cy={C}
            r={58}
            className="sky-halo"
            filter="url(#sky-blur)"
            opacity={0.35}
          />
          <g className="sky-line" fill="none" strokeLinecap="round">
            <circle cx={C} cy={C} r={46} strokeWidth={2.2} />
            {/* terminator — a gibbous line bowing through the disc */}
            <path d={`M ${C} ${C - 45.2} A 19 45.2 0 0 0 ${C} ${C + 45.2}`} strokeWidth={1.2} opacity={0.7} />
            {/* craters on the lit side */}
            <circle cx={C + 14} cy={C - 15} r={7.5} strokeWidth={1} opacity={0.6} />
            <circle cx={C + 24} cy={C + 9} r={4.5} strokeWidth={1} opacity={0.55} />
            <circle cx={C + 8} cy={C + 24} r={3} strokeWidth={1} opacity={0.5} />
            <path d={`M ${C + 28} ${C - 24} a 5 5 0 0 1 6 3`} strokeWidth={1} opacity={0.45} />
            {/* three rim ticks — the moon is also an instrument */}
            <line x1={C - 46} y1={C} x2={C - 52} y2={C} strokeWidth={1.2} opacity={0.5} />
            <line x1={C} y1={C + 46} x2={C} y2={C + 52} strokeWidth={1.2} opacity={0.5} />
            <line x1={C + 46} y1={C} x2={C + 52} y2={C} strokeWidth={1.2} opacity={0.5} />
          </g>
          <circle cx={C - 16} cy={C} r={30} className="sky-fill" opacity={0.08} />
        </g>
      </g>
    </svg>
  );
}
