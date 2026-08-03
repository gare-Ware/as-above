'use client';

// THE POSTER — the magazine cover the whole scene is set on. "AS" / "ABOVE"
// as two stacked billboard lines in the display voice (Fraunces, variable),
// each line an SVG justified edge-to-edge with textLength (species-eval's
// technique: the type scales fluidly with one width budget — no clamp()
// font sizes — and re-justifies live WHILE the weight animates, so the ink
// also reads as the line tightening into its measure). It enters thin and
// GROWS (wght 100 → 900 on a near-critically-damped spring), then stays at
// full poster presence forever: the sun bites the top line, the tablet
// lands across the stack — sun and stone overlap the lettering, never the
// reverse. Layering is DOM order inside .stage-slide: above the wave field,
// beneath .stage (z-index: 1).
//
// Metrics: Fraunces at wght 900 / display opsz — flat caps sit at ~0.700em,
// round-cap overshoot ~0.714em (species-eval's hand measurements; same
// font). Baseline/height are derived from those so a fontSize retune stays
// honest. fontSize per line is chosen so the natural run is CLOSE to the
// 1000-unit measure — textLength then only corrects, never visibly
// stretches the glyphs.

import { motion, type Variants } from 'motion/react';
import {
  POSTER_GLIDE,
  POSTER_INK,
  POSTER_INK_FROM,
  POSTER_INK_REST,
  POSTER_LINE_STAGGER_MS,
  REDUCED_FADE_MS,
} from '@/lib/motion';
import { slow } from '@/lib/slowmo';

/** Round-cap overshoot: where the baseline sits below the viewBox top. */
const BASELINE_EM = 0.717;
/** A whisker under the overshoot, so round caps never shave the box. */
const HEIGHT_EM = 0.736;

/** fontSize tuned so each line's natural width ≈ the 1000u measure.
    `stagger` is the entrance-delay index — explicit, not the array index. */
const LINES = [
  { text: 'AS', fontSize: 690, stagger: 0, cls: 'poster-line' },
  { text: 'ABOVE', fontSize: 286, stagger: 1, cls: 'poster-line' },
  // THE MASTHEAD — the phone composition (≤640px, the drawer's breakpoint):
  // the stack yields to one full-bleed line high in the sky band, the sun's
  // crown biting its middle. CSS swaps which lines display; all three stay
  // mounted so a resize never re-runs the entrance. Stagger 0 — on a phone
  // it is the only visible line and must not wait for a hidden one.
  { text: 'AS ABOVE', fontSize: 208, stagger: 0, cls: 'poster-line poster-line-solo' },
] as const;

export function Poster({ show, reduced }: { show: boolean; reduced: boolean }) {
  const line: Variants = reduced
    ? {
        hidden: { opacity: 0, fontWeight: POSTER_INK_REST },
        show: {
          opacity: 1,
          fontWeight: POSTER_INK_REST,
          transition: { duration: REDUCED_FADE_MS / 1000, ease: 'easeOut' },
        },
      }
    : {
        hidden: { opacity: 0, y: -18, fontWeight: POSTER_INK_FROM },
        show: (i: number) => ({
          opacity: 1,
          y: 0,
          fontWeight: POSTER_INK_REST,
          transition: slow({
            ...POSTER_GLIDE,
            delay: (i * POSTER_LINE_STAGGER_MS) / 1000,
            fontWeight: { ...POSTER_INK, delay: (i * POSTER_LINE_STAGGER_MS) / 1000 },
          }),
        }),
      };

  return (
    <h1 className="poster" aria-label="AS ABOVE">
      {LINES.map(({ text, fontSize, stagger, cls }) => {
        const height = Math.round(fontSize * HEIGHT_EM);
        return (
          <motion.div
            key={text}
            className={cls}
            custom={stagger}
            variants={line}
            initial="hidden"
            animate={show ? 'show' : 'hidden'}
          >
            <svg viewBox={`0 0 1000 ${height}`} role="presentation" aria-hidden="true">
              <text
                x="0"
                y={Math.round(fontSize * BASELINE_EM)}
                textLength="1000"
                lengthAdjust="spacingAndGlyphs"
                fontSize={fontSize}
              >
                {text}
              </text>
            </svg>
          </motion.div>
        );
      })}
    </h1>
  );
}
