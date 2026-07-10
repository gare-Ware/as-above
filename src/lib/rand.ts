// rand.ts — deterministic randomness (xmur3 → mulberry32, the species-eval /
// HATCH tradition). Every procedural detail on stage — dust motes, stars,
// strata jitter, idle glyphs, decode jitter, the fact shuffle — draws from a
// per-session seed, so a sitting is coherent with itself but no two sittings
// are identical.

/** xmur3 string hash → 32-bit seed generator. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 PRNG: fast, tiny, uniform enough for stage dressing. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A reusable deterministic stream for a string seed (+ optional salt). */
export function seededRng(seed: string): () => number {
  return mulberry32(xmur3(seed)());
}

/** Mint a fresh session seed (client-side, once per sitting). */
export function makeSessionSeed(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sky-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
