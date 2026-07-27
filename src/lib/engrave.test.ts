import { describe, expect, it } from 'vitest';
import {
  ENGRAVE_DEFAULTS,
  PROMOTE_THRESHOLD,
  engraveFrame,
  isSettled,
  planEngrave,
} from './engrave';

const OLD = [
  'THE MOON IS A SHIP, PARKED.',
  'Two members of the Soviet Academy of Sciences proposed, in print, that the moon is an artificial hull.',
  'filed under: Sputnik, 1970.',
];
const NEW = [
  'THE SUN RINGS LIKE A BELL.',
  'Helioseismology reads the sun as a resonant body — the whole star oscillates in measurable modes.',
  'filed under: SOHO, 1996.',
];

describe('planEngrave', () => {
  it('one pass lands inside the single-moment budget (~1.2s)', () => {
    const plan = planEngrave(OLD, NEW, 0);
    expect(plan.totalMs).toBe(ENGRAVE_DEFAULTS.passMs + ENGRAVE_DEFAULTS.lagMs);
    expect(plan.totalMs).toBeLessThanOrEqual(1200);
  });

  it('a bare stone skips the erase AND the lag: the light writes at once', () => {
    const plan = planEngrave(['', '', ''], NEW, 0);
    expect(plan.hasOut).toBe(false);
    expect(plan.lagMs).toBe(0);
    expect(plan.totalMs).toBe(ENGRAVE_DEFAULTS.passMs);
    // The outgoing layer never shows: its edge sits fully swept.
    expect(engraveFrame(plan, 10).eraseE).toBe(1);
  });

  it('an early-mash continuation resumes the erase from its current edge', () => {
    const plan = planEngrave(OLD, NEW, 0.37);
    expect(plan.eraseFrom).toBeCloseTo(0.37, 5);
    expect(engraveFrame(plan, 0).eraseE).toBeCloseTo(0.37, 5);
  });

  it('exports the promote threshold the engine branches on', () => {
    expect(PROMOTE_THRESHOLD).toBeGreaterThan(0);
    expect(PROMOTE_THRESHOLD).toBeLessThan(1);
  });
});

describe('engraveFrame', () => {
  const plan = planEngrave(OLD, NEW, 0);

  it('the erase edge leads the write edge for the whole pass', () => {
    for (let t = 20; t < plan.totalMs; t += 25) {
      const fr = engraveFrame(plan, t);
      expect(fr.eraseE).toBeGreaterThan(fr.writeE);
    }
  });

  it('both edges rise monotonically from 0 to 1 — never blank, never stuck', () => {
    let prevErase = -1;
    let prevWrite = -1;
    for (let t = 0; t <= plan.totalMs; t += 20) {
      const fr = engraveFrame(plan, Math.min(t, plan.totalMs));
      expect(fr.eraseE).toBeGreaterThanOrEqual(prevErase);
      expect(fr.writeE).toBeGreaterThanOrEqual(prevWrite);
      expect(fr.eraseE).toBeGreaterThanOrEqual(0);
      expect(fr.eraseE).toBeLessThanOrEqual(1);
      expect(fr.writeE).toBeGreaterThanOrEqual(0);
      expect(fr.writeE).toBeLessThanOrEqual(1);
      prevErase = fr.eraseE;
      prevWrite = fr.writeE;
    }
  });

  it('the write is still landing when the erase completes — one gesture', () => {
    // At the erase's finish line the write must be nearly done (the lag),
    // not waiting on a fresh phase of its own.
    const fr = engraveFrame(plan, plan.passMs);
    expect(fr.eraseE).toBeCloseTo(1, 5);
    expect(fr.writeE).toBeGreaterThan(0.9);
  });

  it('settles fully written: both edges at 1, and stays there', () => {
    for (const t of [plan.totalMs, plan.totalMs + 1, plan.totalMs + 5000]) {
      const fr = engraveFrame(plan, t);
      expect(fr.phase).toBe('settled');
      expect(fr.eraseE).toBe(1);
      expect(fr.writeE).toBe(1);
      expect(isSettled(plan, t)).toBe(true);
    }
    expect(isSettled(plan, plan.totalMs - 1)).toBe(false);
  });

  it('both edges start and end at zero velocity (no snap at either end)', () => {
    // Ease-in-out: the first and last steps of the pass move far less than
    // a mid-pass step of the same duration.
    const step = 40;
    const first = engraveFrame(plan, step).eraseE - engraveFrame(plan, 0).eraseE;
    const mid =
      engraveFrame(plan, plan.passMs / 2 + step / 2).eraseE -
      engraveFrame(plan, plan.passMs / 2 - step / 2).eraseE;
    const last =
      engraveFrame(plan, plan.passMs - 1).eraseE -
      engraveFrame(plan, plan.passMs - 1 - step).eraseE;
    expect(first).toBeLessThan(mid / 3);
    expect(last).toBeLessThan(mid / 3);
  });

  it('is a pure function of (plan, t) — same t, same frame', () => {
    for (const t of [0, 111, plan.lagMs + 40, plan.totalMs - 5]) {
      expect(engraveFrame(plan, t)).toEqual(engraveFrame(plan, t));
    }
  });
});
