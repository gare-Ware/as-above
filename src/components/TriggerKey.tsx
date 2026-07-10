'use client';

// The TRIGGER key — the app's one primary control: a single blood-red keycap
// on a one-key slice of the terminal's bone keyboard. It is a trigger and
// nothing else. Real key physics: press travels down fast and fires
// IMMEDIATELY (pointerdown, never click); release settles on the stage's one
// rationed bouncy spring. The global keyboard path (Enter/Space anywhere)
// drives the same physics through the imperative handle.

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
    const capRef = useRef<HTMLSpanElement>(null);
    const plateRef = useRef<HTMLDivElement>(null);
    const anim = useRef<ReturnType<typeof animate> | null>(null);

    function press() {
      const cap = capRef.current;
      if (!cap) return;
      anim.current?.stop();
      anim.current = animate(
        cap,
        { transform: `translateY(${TABLET.key.travelPx}px)` },
        { duration: TABLET.key.pressMs / 1000, ease: 'easeOut' },
      );
      plateRef.current?.setAttribute('data-pressed', 'true');
    }

    function release() {
      const cap = capRef.current;
      if (!cap) return;
      anim.current?.stop();
      anim.current = animate(cap, { transform: 'translateY(0px)' }, KEY_RELEASE);
      plateRef.current?.setAttribute('data-pressed', 'false');
    }

    useImperativeHandle(handle, () => ({ press, release }));

    function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers (tests, capture scripts) have no live pointerId.
      }
      press();
      onFire();
    }

    return (
      <div ref={plateRef} className="key-plate" data-pressed="false">
        <span className="key-neighbor key-neighbor-l" aria-hidden="true" />
        <button
          type="button"
          className="key-trigger"
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
          <span ref={capRef} className="key-cap">
            <span className="key-cap-glyph" aria-hidden="true">
              ▲
            </span>
          </span>
        </button>
        <span className="key-neighbor key-neighbor-r" aria-hidden="true" />
        <span className="key-label" aria-hidden="true">
          trigger
        </span>
      </div>
    );
  },
);
