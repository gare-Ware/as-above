// picker.ts — the fact pick: a seeded shuffle bag per body. Guarantees: no
// fact repeats until its body's pool is exhausted, and across a reshuffle
// boundary the same fact is never shown twice in a row. Pure — the caller
// owns the state; every step returns the next state.

export interface PickerState {
  /** Shuffled indices into the body's fact pool. */
  order: number[];
  /** Next position in `order` to deal. */
  cursor: number;
}

/** Fisher–Yates over [0, n). */
export function shuffledIndices(n: number, rng: () => number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function initPicker(poolSize: number, rng: () => number): PickerState {
  if (poolSize <= 0) throw new Error('picker needs a non-empty pool');
  return { order: shuffledIndices(poolSize, rng), cursor: 0 };
}

/**
 * Deal the next fact index. When the bag empties it reshuffles, forbidding
 * the fresh bag from opening with the fact just shown (unless the pool has
 * only one fact, where repetition is arithmetic, not a bug).
 */
export function nextPick(
  state: PickerState,
  rng: () => number,
): { index: number; state: PickerState } {
  const n = state.order.length;
  if (state.cursor < n) {
    return {
      index: state.order[state.cursor],
      state: { order: state.order, cursor: state.cursor + 1 },
    };
  }
  const last = state.order[n - 1];
  const order = shuffledIndices(n, rng);
  if (n > 1 && order[0] === last) {
    const j = 1 + Math.floor(rng() * (n - 1));
    [order[0], order[j]] = [order[j], order[0]];
  }
  return { index: order[0], state: { order, cursor: 1 } };
}
