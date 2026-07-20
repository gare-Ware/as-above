'use client';

// Ambient particulate life, seeded per session: dust motes rising past the
// altar and sparse stars for moon mode (they exist in both modes — the
// --star token simply extinguishes them under the sun). The ground mist
// retired with the earth. All animation is CSS, gated in globals.css on
// [data-motion='live'] and prefers-reduced-motion — and every amplitude is
// ranked strictly under interactive feedback.

import { useMemo } from 'react';
import { seededRng } from '@/lib/rand';

export function Dust({ seed }: { seed: string }) {
  const field = useMemo(() => {
    const rng = seededRng(`${seed}:dust`);
    const motes = Array.from({ length: 14 }, (_, i) => ({
      key: `m${i}`,
      left: 18 + rng() * 64, // % — concentrated around the altar
      bottom: 16 + rng() * 12, // %
      size: 1.6 + rng() * 2.2,
      dur: 9 + rng() * 8,
      delay: -rng() * 17,
      drift: (rng() - 0.5) * 46,
      peak: 0.16 + rng() * 0.2,
    }));
    const stars = Array.from({ length: 26 }, (_, i) => ({
      key: `s${i}`,
      left: 4 + rng() * 92, // %
      top: 3 + rng() * 46, // % — upper sky only
      size: 1 + rng() * 1.6,
      slow: rng() < 0.5,
      delay: -rng() * 12,
    }));
    return { motes, stars };
  }, [seed]);

  return (
    <div className="dustfield" aria-hidden="true">
      {field.stars.map((s) => (
        <span
          key={s.key}
          className={`star ${s.slow ? 'star-slow' : 'star-quick'}`}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {field.motes.map((m) => (
        <span
          key={m.key}
          className="mote"
          style={
            {
              left: `${m.left}%`,
              bottom: `${m.bottom}%`,
              width: m.size,
              height: m.size,
              '--mote-dur': `${m.dur}s`,
              '--mote-delay': `${m.delay}s`,
              '--mote-drift': `${m.drift}px`,
              '--mote-peak': m.peak,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
