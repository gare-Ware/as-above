'use client';

// The console — tuning lives here, not the trigger. HATCH's thumb-first
// drawer, restyled as the rest of the terminal's keyboard: a bone field in
// the control voice holding everything that is NOT the trigger. On narrow
// viewports the WHOLE stage slides up to reveal this panel beneath (the app
// is the drawer — AsAboveApp owns that translate); on desktop it rises as a
// slim bottom bar.

import { motion } from 'motion/react';
import type { BodyId } from '@/data/facts';
import { PANEL_SPRING, PRESS } from '@/lib/motion';

interface ConsoleProps {
  open: boolean;
  onToggle: () => void;
  mode: BodyId;
  onMode: (mode: BodyId) => void;
  motionLive: boolean;
  onMotionLive: (live: boolean) => void;
  oracleAuto: boolean;
  onOracleAuto: (auto: boolean) => void;
  isMobile: boolean;
}

export function Console({
  open,
  onToggle,
  mode,
  onMode,
  motionLive,
  onMotionLive,
  oracleAuto,
  onOracleAuto,
  isMobile,
}: ConsoleProps) {
  return (
    <>
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="console-panel"
        {...PRESS}
        className="console-chip"
      >
        <motion.span aria-hidden initial={{ rotate: 0 }} animate={{ rotate: open ? 180 : 0 }} transition={PANEL_SPRING}>
          ▴
        </motion.span>
        {open ? 'done' : 'console'}
      </motion.button>

      <motion.div
        id="console-panel"
        role="group"
        aria-label="Console"
        // Closed, the panel is off-screen (desktop) or under the stage
        // (mobile) — inert keeps its controls out of the tab order until
        // the drawer actually opens.
        inert={!open}
        initial={false}
        animate={{ y: isMobile ? 0 : open ? 0 : '112%' }}
        transition={PANEL_SPRING}
        className="console-panel"
        data-mobile={isMobile}
      >
        <div className="console-rows">
          <OptionRow<BodyId>
            label="sky"
            options={['sun', 'moon']}
            value={mode}
            onChange={onMode}
          />
          <OptionRow
            label="motion"
            options={['live', 'still'] as const}
            value={motionLive ? 'live' : 'still'}
            onChange={(v) => onMotionLive(v === 'live')}
          />
          <OptionRow
            label="oracle"
            options={['auto', 'off'] as const}
            value={oracleAuto ? 'auto' : 'off'}
            onChange={(v) => onOracleAuto(v === 'auto')}
          />
        </div>
        <p className="console-footnote" aria-hidden="true">
          enter — trigger · s — sky
        </p>
      </motion.div>
    </>
  );
}

function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="console-row" role="radiogroup" aria-label={label}>
      <span className="console-row-label">{label}</span>
      <div className="console-options">
        {options.map((opt) => (
          <motion.button
            key={opt}
            type="button"
            role="radio"
            aria-checked={opt === value}
            {...PRESS}
            className="console-option"
            onClick={() => onChange(opt)}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
