import { describe, expect, it } from 'vitest';
import { seededRng } from './rand';
import { DECODE_DEFAULTS, isSettled, planDecode, renderBlock } from './decode';

const TEXTS = [
  'THE MOON IS A SHIP, PARKED.',
  'Two members of the Soviet Academy of Sciences proposed, in print, that the moon is an artificial hull.',
  'filed under: Sputnik, 1970.',
];

describe('planDecode', () => {
  it('fully legible under the hard ceiling (~900ms)', () => {
    const plan = planDecode(TEXTS, seededRng('t'));
    expect(plan.totalMs).toBeLessThanOrEqual(DECODE_DEFAULTS.maxMs);
    expect(plan.totalMs).toBeLessThanOrEqual(900);
  });

  it('spaces and newlines are pre-resolved (word wrap never jumps)', () => {
    const plan = planDecode(['a b\nc'], seededRng('t'));
    expect(plan.blocks[0].resolveAt[1]).toBe(0);
    expect(plan.blocks[0].resolveAt[3]).toBe(0);
  });
});

describe('renderBlock', () => {
  const plan = planDecode(TEXTS, seededRng('render'));

  it('holds the target length at every frame (monospace layout stability)', () => {
    for (const t of [0, 40, 200, 500, 700, 880, 2000]) {
      TEXTS.forEach((text, b) => {
        expect(renderBlock(plan, b, t)).toHaveLength(text.length);
      });
    }
  });

  it('is monotonic: a cell past its resolve time always shows the target', () => {
    for (const t of [0, 60, 150, 300, 450, 600, 750, plan.totalMs]) {
      plan.blocks.forEach((block, b) => {
        const shown = renderBlock(plan, b, t);
        for (let i = 0; i < block.text.length; i += 1) {
          if (t >= block.resolveAt[i]) {
            expect(shown[i]).toBe(block.text[i]);
          }
        }
      });
    }
  });

  it('settles to the exact target text', () => {
    expect(isSettled(plan, plan.totalMs)).toBe(true);
    TEXTS.forEach((text, b) => {
      expect(renderBlock(plan, b, plan.totalMs)).toBe(text);
    });
  });

  it('is deterministic within a churn tick (no per-frame flicker storm)', () => {
    const t = 100;
    const sameTick = t + plan.churnMs - (t % plan.churnMs) - 1;
    expect(renderBlock(plan, 1, t)).toBe(renderBlock(plan, 1, sameTick));
  });

  it('spaces stay spaces while everything else boils', () => {
    const shown = renderBlock(plan, 1, 10);
    for (let i = 0; i < TEXTS[1].length; i += 1) {
      if (TEXTS[1][i] === ' ') expect(shown[i]).toBe(' ');
    }
  });
});
