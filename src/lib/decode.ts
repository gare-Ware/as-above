// decode.ts — the phosphor decode as pure text math, no DOM. A decode run
// plans a per-character resolve schedule for the fact's blocks (claim, lore,
// reality tag); the renderer answers "what does block b show at time t".
//
// Interruptible by construction: nothing here accumulates — a retrigger
// simply plans toward the NEW text and renders from the same clock, so cells
// that were noise keep churning and cells that were settled dissolve into the
// next scramble. There is no restart-from-zero anywhere.
//
// Layout stability: spaces stay spaces and every unresolved cell holds a
// same-width noise glyph (the tablet face is monospace), so word wrap never
// jumps while the text is still boiling.

export interface DecodeOpts {
  /** Quiet head start before the first cell lands. */
  baseMs: number;
  /** Extra delay before each successive block (claim → lore → tag). */
  blockStaggerMs: number;
  /** The cascade window: a block's cells land across this span, first → last. */
  cascadeMs: number;
  /** Per-cell random spread on top of the cascade. */
  jitterMs: number;
  /** Hard ceiling — fully legible by here, whatever the text length. */
  maxMs: number;
  /** Noise re-randomize period (churn slower than the frame rate). */
  churnMs: number;
}

export const DECODE_DEFAULTS: DecodeOpts = {
  baseMs: 50,
  blockStaggerMs: 120,
  cascadeMs: 420,
  jitterMs: 150,
  maxMs: 880,
  churnMs: 55,
};

export interface DecodePlan {
  blocks: { text: string; resolveAt: number[] }[];
  totalMs: number;
  churnMs: number;
}

const NOISE = '#%&*+/<=>?@[]^{}~!;:0123479';

/** Deterministic noise glyph for a cell at a churn tick — pure, no state. */
export function noiseChar(block: number, cell: number, tick: number): string {
  let h = (block + 1) * 2654435761;
  h = (h ^ Math.imul(cell + 1, 19349663) ^ Math.imul(tick + 1, 83492791)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return NOISE[(h >>> 0) % NOISE.length];
}

/** Plan a decode toward the given block texts (reading-order cascade). */
export function planDecode(
  texts: string[],
  rng: () => number,
  opts: DecodeOpts = DECODE_DEFAULTS,
): DecodePlan {
  let totalMs = 0;
  const blocks = texts.map((text, b) => {
    const len = text.length;
    const resolveAt = new Array<number>(len);
    for (let i = 0; i < len; i += 1) {
      if (text[i] === ' ' || text[i] === '\n') {
        resolveAt[i] = 0;
        continue;
      }
      const cascade = len > 1 ? (i / (len - 1)) * opts.cascadeMs : 0;
      const at = Math.min(
        opts.maxMs,
        opts.baseMs + b * opts.blockStaggerMs + cascade + rng() * opts.jitterMs,
      );
      resolveAt[i] = at;
      if (at > totalMs) totalMs = at;
    }
    return { text, resolveAt };
  });
  return { blocks, totalMs, churnMs: opts.churnMs };
}

/** What block `b` shows at time `t` since the plan's start. */
export function renderBlock(plan: DecodePlan, b: number, tMs: number): string {
  const block = plan.blocks[b];
  if (!block) return '';
  if (tMs >= plan.totalMs) return block.text;
  const tick = Math.floor(tMs / plan.churnMs);
  let out = '';
  for (let i = 0; i < block.text.length; i += 1) {
    out += tMs >= block.resolveAt[i] ? block.text[i] : noiseChar(b, i, tick);
  }
  return out;
}

export function isSettled(plan: DecodePlan, tMs: number): boolean {
  return tMs >= plan.totalMs;
}
