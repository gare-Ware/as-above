import { describe, expect, it } from 'vitest';
import { BODY_IDS, FACTS, factsFor } from './facts';

describe('corpus integrity', () => {
  it('holds at least 15 facts per body', () => {
    for (const body of BODY_IDS) {
      expect(factsFor(body).length).toBeGreaterThanOrEqual(15);
    }
  });

  it('every id is unique', () => {
    const ids = FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry speaks in full: claim, lore, reality tag, tones', () => {
    for (const f of FACTS) {
      expect(f.claim.trim().length).toBeGreaterThan(0);
      expect(f.lore.trim().length).toBeGreaterThan(0);
      expect(f.filedUnder.trim().length).toBeGreaterThan(0);
      expect(f.tones.length).toBeGreaterThan(0);
    }
  });

  it('the honesty wink is mandatory: every reality tag carries a Status', () => {
    for (const f of FACTS) {
      expect(f.filedUnder).toMatch(/Status:/);
    }
  });

  it('claims stay headline-sized and lore stays tablet-sized', () => {
    for (const f of FACTS) {
      expect(f.claim.length).toBeLessThanOrEqual(100);
      expect(f.lore.length).toBeLessThanOrEqual(620);
      expect(f.filedUnder.length).toBeLessThanOrEqual(220);
    }
  });

  it('both skies are reachable and disjoint', () => {
    const sun = factsFor('sun');
    const moon = factsFor('moon');
    expect(sun.length + moon.length).toBe(FACTS.length);
    for (const f of sun) expect(f.body).toBe('sun');
    for (const f of moon) expect(f.body).toBe('moon');
  });
});
