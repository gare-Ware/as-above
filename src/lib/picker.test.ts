import { describe, expect, it } from 'vitest';
import { seededRng } from './rand';
import { initPicker, nextPick, shuffledIndices, type PickerState } from './picker';

function deal(state: PickerState, rng: () => number, count: number): number[] {
  const out: number[] = [];
  let s = state;
  for (let i = 0; i < count; i += 1) {
    const r = nextPick(s, rng);
    out.push(r.index);
    s = r.state;
  }
  return out;
}

describe('shuffledIndices', () => {
  it('is a permutation of [0, n)', () => {
    const rng = seededRng('perm');
    const order = shuffledIndices(9, rng);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is deterministic for a given seed', () => {
    expect(shuffledIndices(12, seededRng('same'))).toEqual(
      shuffledIndices(12, seededRng('same')),
    );
  });
});

describe('picker', () => {
  it('deals every fact exactly once before any repeat (pool exhaustion)', () => {
    const rng = seededRng('bag');
    const picks = deal(initPicker(7, rng), rng, 7 * 40);
    for (let cycle = 0; cycle < 40; cycle += 1) {
      const window = picks.slice(cycle * 7, cycle * 7 + 7);
      expect([...new Set(window)].length).toBe(7);
    }
  });

  it('never shows the same fact twice in a row, across every reshuffle', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const rng = seededRng(seed);
      const picks = deal(initPicker(5, rng), rng, 500);
      for (let i = 1; i < picks.length; i += 1) {
        expect(picks[i]).not.toBe(picks[i - 1]);
      }
    }
  });

  it('tolerates a single-fact pool (repetition is arithmetic, not a bug)', () => {
    const rng = seededRng('one');
    expect(deal(initPicker(1, rng), rng, 4)).toEqual([0, 0, 0, 0]);
  });

  it('rejects an empty pool', () => {
    expect(() => initPicker(0, seededRng('x'))).toThrow();
  });
});
