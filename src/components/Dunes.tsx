'use client';

// The earth — minimal seeded dunes behind the tablet, in the HATCH-dune
// tradition: three rolling silhouettes stacked to the stage floor. The ONE
// still thing on stage — the anchor everything else moves against.

import { useMemo } from 'react';
import { seededRng } from '@/lib/rand';

const W = 1000;
const H = 260;

/** One rolling dune edge across the width, closed to the floor. */
function duneEdge(rng: () => number, yBase: number, sway: number): string {
  const humps = 4 + Math.floor(rng() * 2);
  const step = W / humps;
  let x = 0;
  let y = yBase + (rng() - 0.5) * sway;
  let d = `M 0 ${y.toFixed(0)} `;
  for (let h = 0; h < humps; h += 1) {
    const nx = x + step;
    const ny = yBase + (rng() - 0.5) * 2 * sway;
    const c1x = x + step * (0.28 + rng() * 0.18);
    const c2x = x + step * (0.58 + rng() * 0.18);
    d += `C ${c1x.toFixed(0)} ${(y + (rng() - 0.5) * sway).toFixed(0)} ${c2x.toFixed(0)} ${(ny + (rng() - 0.5) * sway).toFixed(0)} ${nx.toFixed(0)} ${ny.toFixed(0)} `;
    x = nx;
    y = ny;
  }
  return `${d}L ${W} ${H} L 0 ${H} Z`;
}

export function Dunes({ seed }: { seed: string }) {
  const art = useMemo(() => {
    const rng = seededRng(`${seed}:dunes`);
    return {
      far: duneEdge(rng, 54, 17),
      mid: duneEdge(rng, 112, 21),
      near: duneEdge(rng, 176, 23),
    };
  }, [seed]);

  return (
    <svg
      className="dunes"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={art.far} className="dune-1" />
      <path d={art.mid} className="dune-2" />
      <path d={art.near} className="dune-3" />
    </svg>
  );
}
