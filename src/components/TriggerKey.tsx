'use client';

// The TRIGGER — the app's one primary control: a liquid-glass pill in the
// thumb zone. It is a trigger and nothing else. The press is a major moment:
// it fires IMMEDIATELY (pointerdown, never click), drops and squishes like
// pressed liquid, blooms a refraction flash from the touch point, and — via
// the orchestrator — launches a pulse ring through the wave field while the
// tablet takes the weight. Release settles on the stage's one rationed
// jelly-bounce. The global keyboard path (Enter/Space anywhere) drives the
// same physics through the imperative handle.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { animate } from 'motion';
import { KEY_RELEASE } from '@/lib/motion';
import { TABLET } from '@/lib/tablet';

export interface TriggerKeyHandle {
  press: () => void;
  release: () => void;
}

export const TriggerKey = forwardRef<TriggerKeyHandle, { onFire: () => void }>(
  function TriggerKey({ onFire }, handle) {
    const pillRef = useRef<HTMLButtonElement>(null);
    const bloomRef = useRef<HTMLSpanElement>(null);
    const anim = useRef<ReturnType<typeof animate> | null>(null);

    function press(atX?: number, atY?: number) {
      const pill = pillRef.current;
      if (!pill) return;
      anim.current?.stop();
      pill.dataset.pressed = 'true';
      anim.current = animate(
        pill,
        { transform: `translateY(${TABLET.key.travelPx}px) scale(0.955, 0.9)` },
        { duration: TABLET.key.pressMs / 1000, ease: 'easeOut' },
      );
      const bloom = bloomRef.current;
      if (bloom) {
        pill.style.setProperty('--press-x', atX === undefined ? '50%' : `${atX}px`);
        pill.style.setProperty('--press-y', atY === undefined ? '50%' : `${atY}px`);
        bloom.dataset.bloom = 'false';
        void bloom.offsetWidth; // restart the bloom animation
        bloom.dataset.bloom = 'true';
      }
    }

    function release() {
      const pill = pillRef.current;
      if (!pill) return;
      anim.current?.stop();
      pill.dataset.pressed = 'false';
      // The one bounce on stage: glass settling like liquid.
      anim.current = animate(pill, { transform: 'translateY(0px) scale(1, 1)' }, KEY_RELEASE);
    }

    useImperativeHandle(handle, () => ({ press: () => press(), release }));

    function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers (tests, capture scripts) have no live pointerId.
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      press(x, y);
      onFire();
    }

    return (
      <button
        ref={pillRef}
        type="button"
        className="glass-pill"
        data-pressed="false"
        aria-label="Trigger — the tablet answers"
        onPointerDown={onPointerDown}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        onKeyDown={(e) => {
          // The global handler owns Enter/Space so the physics can't
          // double-fire; swallow the native button activation.
          if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
        }}
      >
        <span className="pill-shine" aria-hidden="true" />
        <span ref={bloomRef} className="pill-bloom" data-bloom="false" aria-hidden="true" />
        <span className="pill-label">trigger</span>
      </button>
    );
  },
);
