'use client';

// The wave field — the world itself. Seeded wobble-edged rings radiate from
// the body's center across the entire viewport, each one shade step from the
// sky's root color toward the deep edge tone (element-scoped color-mix, so
// the whole sea glides on a mode flip). This component supplies geometry
// only; the engine (AsAboveApp) writes one scale per ring — a phase-lagged
// radial oscillation that reads as crests traveling outward forever, with no
// respawn seam — and drives the ripple fronts through the same field: each
// pulse slot is a two-circle group (bright leading edge + thick faint echo —
// glow with zero filters) the engine positions at the fire's ORIGIN (the key
// for a press, the body for a swap) and expands across the whole sea.
// Fills are flat and unfiltered on purpose: this SVG repaints every frame.

import { useMemo, type RefObject } from 'react';
import { seededRng } from '@/lib/rand';
import { TABLET } from '@/lib/tablet';

export interface WavesRefs {
  svg: RefObject<SVGSVGElement | null>;
  rings: RefObject<(SVGPathElement | null)[]>;
  pulses: RefObject<(SVGGElement | null)[]>;
  radii: RefObject<number[]>;
}

export interface WaveRingGeo {
  R: number;
  d: string;
  mix: number;
}

/**
 * The ring geometry, pure and deterministic per seed — exported so the
 * TRIGGER key can render a pixel-aligned windowed COPY of the field inside
 * its glass (the real-refraction lens bends the copy; same seed → same sea).
 */
export function buildWaveRings(seed: string): WaveRingGeo[] {
  const rng = seededRng(`${seed}:waves`);
  const W = TABLET.waves;
  const out = [] as WaveRingGeo[];
  for (let i = 0; i < W.ringCount; i += 1) {
    const R = W.innerRadius + ((W.outerRadius - W.innerRadius) * i) / (W.ringCount - 1);
    // Shade order: root at the body, easing toward the edge tone.
    const mix = Math.round(100 * (1 - Math.pow(i / (W.ringCount - 1), 1.18)));
    out.push({ R, d: blobPath(rng, R, W.wobbleBase + i * W.wobblePerRing), mix });
  }
  return out;
}

/** A closed organic ring: radial wobble smoothed Catmull-Rom → cubic. */
function blobPath(rng: () => number, R: number, wobble: number, points = 26): string {
  const pts: [number, number][] = [];
  for (let j = 0; j < points; j += 1) {
    const a = (j / points) * Math.PI * 2;
    const r = R + (rng() - 0.5) * 2 * wobble;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
  for (let j = 0; j < points; j += 1) {
    const p0 = pts[(j - 1 + points) % points];
    const p1 = pts[j];
    const p2 = pts[(j + 1) % points];
    const p3 = pts[(j + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
  }
  return `${d}Z`;
}

export function Waves({ seed, refs }: { seed: string; refs: WavesRefs }) {
  const rings = useMemo(() => {
    const out = buildWaveRings(seed);
    refs.radii.current = out.map((r) => r.R);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  return (
    <svg
      ref={refs.svg}
      className="waves"
      viewBox="0 0 1200 1200"
      aria-hidden="true"
      shapeRendering="optimizeSpeed"
    >
      <g transform="translate(600 600)">
        {/* Painted outermost-first so each smaller ring sits on top. */}
        {[...rings].reverse().map((ring, rev) => {
          const i = rings.length - 1 - rev;
          return (
            <path
              key={i}
              ref={(el) => {
                refs.rings.current[i] = el;
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
              refs.pulses.current[p] = el;
            }}
            opacity={0}
          >
            {/* Trailing echo first (beneath), leading edge on top. */}
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
  );
}
