import { useEffect, useRef } from "react";

/**
 * Enterprise idle/absolute-session enforcement.
 * - Calls `onIdle` after `idleMs` of no user activity.
 * - Calls `onAbsoluteExpiry` after `absoluteMs` since login regardless of activity.
 * - Activity is shared across tabs via localStorage so a user active in any tab keeps all tabs alive.
 */
const ACTIVITY_KEY = "cb_last_activity";
const SESSION_START_KEY = "cb_session_started_at";

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
];

export function markSessionStart() {
  const now = Date.now();
  localStorage.setItem(SESSION_START_KEY, String(now));
  localStorage.setItem(ACTIVITY_KEY, String(now));
}

export function clearSessionMarkers() {
  localStorage.removeItem(SESSION_START_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

interface Options {
  enabled: boolean;
  idleMs?: number; // default 15 min
  absoluteMs?: number; // default 12 h
  onIdle: () => void;
  onAbsoluteExpiry: () => void;
}

export function useIdleLogout({
  enabled,
  idleMs = 15 * 60 * 1000,
  absoluteMs = 12 * 60 * 60 * 1000,
  onIdle,
  onAbsoluteExpiry,
}: Options) {
  const idleRef = useRef(onIdle);
  const absRef = useRef(onAbsoluteExpiry);
  idleRef.current = onIdle;
  absRef.current = onAbsoluteExpiry;

  useEffect(() => {
    if (!enabled) return;

    // Ensure session start exists (covers refresh)
    if (!localStorage.getItem(SESSION_START_KEY)) {
      localStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }
    if (!localStorage.getItem(ACTIVITY_KEY)) {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    }

    const bumpActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, bumpActivity, { passive: true }),
    );

    const interval = window.setInterval(() => {
      const now = Date.now();
      const lastActive = Number(localStorage.getItem(ACTIVITY_KEY) || now);
      const started = Number(localStorage.getItem(SESSION_START_KEY) || now);

      if (now - started > absoluteMs) {
        absRef.current();
        return;
      }
      if (now - lastActive > idleMs) {
        idleRef.current();
      }
    }, 30 * 1000); // check every 30s

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, bumpActivity),
      );
      window.clearInterval(interval);
    };
  }, [enabled, idleMs, absoluteMs]);
}
