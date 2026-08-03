import { describe, expect, it } from 'vitest';
import { TABLET, introPhaseAt, ringBirthPose, ringBirthTotalMs } from './tablet';

// The world's birth — pure math the engine trusts unguarded: clamped at
// both ends, monotonic in between, and finished exactly when the total
// says it is.

const I = TABLET.intro.birth;
const R = 400; // a mid-field ring radius, svg units

describe('ringBirthPose', () => {
  it('holds a ring collapsed and dark before its stagger slot opens', () => {
    const ring3 = ringBirthPose(I.ringStaggerMs * 3 - 1, 3, R);
    expect(ring3.scale).toBeCloseTo(I.fromU / R, 5);
    expect(ring3.opacity).toBe(0);
  });

  it('grows monotonically and never past rest', () => {
    let prev = 0;
    for (let t = 0; t <= I.ringMs + 200; t += 16) {
      const { scale } = ringBirthPose(t, 0, R);
      expect(scale).toBeGreaterThanOrEqual(prev);
      expect(scale).toBeLessThanOrEqual(1);
      prev = scale;
    }
  });

  it('rests exactly at 1 once its growth ends (and stays there)', () => {
    expect(ringBirthPose(I.ringMs, 0, R).scale).toBe(1);
    expect(ringBirthPose(1e9, 5, R).scale).toBe(1);
    expect(ringBirthPose(1e9, 5, R).opacity).toBe(1);
  });

  it('ramps opacity in over fadeMs at the slot, independent of growth', () => {
    const mid = ringBirthPose(I.ringStaggerMs * 2 + I.fadeMs / 2, 2, R);
    expect(mid.opacity).toBeCloseTo(0.5, 5);
    expect(ringBirthPose(I.ringStaggerMs * 2 + I.fadeMs, 2, R).opacity).toBe(1);
  });

  it('never births a scale-up on a ring smaller than the collapse radius', () => {
    for (let t = 0; t <= I.ringMs; t += 40) {
      expect(ringBirthPose(t, 0, I.fromU / 2).scale).toBe(1);
    }
  });

  it('is finished for every ring exactly at ringBirthTotalMs', () => {
    const total = ringBirthTotalMs();
    expect(total).toBe((TABLET.waves.ringCount - 1) * I.ringStaggerMs + I.ringMs);
    for (let i = 0; i < TABLET.waves.ringCount; i += 1) {
      expect(ringBirthPose(total, i, R).scale).toBe(1);
      expect(ringBirthPose(total, i, R).opacity).toBe(1);
    }
    // …and NOT one frame earlier for the last ring.
    const last = TABLET.waves.ringCount - 1;
    expect(ringBirthPose(total - 16, last, R).scale).toBeLessThan(1);
  });
});

describe('introPhaseAt', () => {
  it('walks the full-motion beats on the shared virtual clock', () => {
    const I = TABLET.intro;
    expect(introPhaseAt(0, false)).toBe('waves');
    expect(introPhaseAt(I.posterAtMs, false)).toBe('poster');
    expect(introPhaseAt(I.tabletAtMs, false)).toBe('tablet');
    expect(introPhaseAt(I.keyAtMs, false)).toBe('key');
    expect(introPhaseAt(I.doneAtMs, false)).toBe('done');
  });

  it('opens the inert crossfade immediately but withholds done until it settles', () => {
    expect(introPhaseAt(0, true)).toBe('key');
    expect(introPhaseAt(TABLET.intro.reducedDoneMs - 1, true)).toBe('key');
    expect(introPhaseAt(TABLET.intro.reducedDoneMs, true)).toBe('done');
  });
});
