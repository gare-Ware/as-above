import { describe, expect, it } from 'vitest';
import { factsFor } from '@/data/facts';
import { seededRng } from './rand';
import { currentFact, initOracle, setMode, trigger } from './state';

describe('oracle state', () => {
  it('starts under the sun with nothing yet spoken', () => {
    const s = initOracle(seededRng('init'));
    expect(s.mode).toBe('sun');
    expect(currentFact(s)).toBeNull();
    expect(s.serial).toBe(0);
  });

  it('trigger deals only from the active body, and serial advances', () => {
    const rng = seededRng('deal');
    let s = initOracle(rng);
    for (let i = 0; i < 40; i += 1) {
      s = trigger(s, rng);
      const fact = currentFact(s);
      expect(fact).not.toBeNull();
      expect(fact!.body).toBe('sun');
    }
    expect(s.serial).toBe(40);
  });

  it('mode toggle is a pure swap — each body keeps its own memory', () => {
    const rng = seededRng('swap');
    let s = initOracle(rng);
    s = trigger(s, rng);
    const sunFact = currentFact(s);
    expect(sunFact!.body).toBe('sun');

    s = setMode(s, 'moon');
    expect(currentFact(s)).toBeNull(); // the moon hasn't spoken yet
    expect(s.serial).toBe(1); // swapping decodes nothing

    s = trigger(s, rng);
    const moonFact = currentFact(s);
    expect(moonFact!.body).toBe('moon');

    s = setMode(s, 'sun');
    expect(currentFact(s)).toEqual(sunFact); // no corpus bleed, no amnesia
    s = setMode(s, 'moon');
    expect(currentFact(s)).toEqual(moonFact);
  });

  it('full pools cycle without repeats per body (delegated picker law)', () => {
    const rng = seededRng('cycle');
    let s = initOracle(rng);
    const n = factsFor('sun').length;
    const seen = new Set<string>();
    for (let i = 0; i < n; i += 1) {
      s = trigger(s, rng);
      seen.add(currentFact(s)!.id);
    }
    expect(seen.size).toBe(n);
  });
});
