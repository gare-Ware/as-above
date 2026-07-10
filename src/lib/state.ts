// state.ts — the app's small typed state: which sky is up, which fact each
// sky last spoke, and a serial that keys every new decode. Transitions are
// pure and unit-tested; timing and DOM effects live in components. (A full
// flow machine would be ceremony — there are only two verbs here.)

import { factsFor, type BodyId, type Fact } from '@/data/facts';
import { initPicker, nextPick, type PickerState } from './picker';

export interface OracleState {
  mode: BodyId;
  pickers: Record<BodyId, PickerState>;
  /** Last-spoken fact index per body (into factsFor(body)) — bodies keep
      their own memory across sky swaps; no corpus bleed. */
  current: Record<BodyId, number | null>;
  /** Increments on every new pick — components key decodes off it. */
  serial: number;
}

export function initOracle(rng: () => number): OracleState {
  return {
    mode: 'sun',
    pickers: {
      sun: initPicker(factsFor('sun').length, rng),
      moon: initPicker(factsFor('moon').length, rng),
    },
    current: { sun: null, moon: null },
    serial: 0,
  };
}

/** TRIGGER: deal the active sky's next fact. */
export function trigger(state: OracleState, rng: () => number): OracleState {
  const body = state.mode;
  const { index, state: picker } = nextPick(state.pickers[body], rng);
  return {
    ...state,
    pickers: { ...state.pickers, [body]: picker },
    current: { ...state.current, [body]: index },
    serial: state.serial + 1,
  };
}

/** SKY: a pure swap — nothing is picked, nothing is forgotten. */
export function setMode(state: OracleState, mode: BodyId): OracleState {
  if (mode === state.mode) return state;
  return { ...state, mode };
}

export function currentFact(state: OracleState): Fact | null {
  const idx = state.current[state.mode];
  return idx === null ? null : factsFor(state.mode)[idx];
}
