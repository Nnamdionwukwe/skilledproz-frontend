// src/lib/analytics/useTracker.js
// ─────────────────────────────────────────────────────────────────────────────
// React hook so components can emit events without importing the singleton
// directly. Keeps the surface small and lets us later swap implementation.
//
// Usage:
//   const { track, click, page, action } = useTracker();
//   <button onClick={() => click("booking.submit", { bookingId })}>Submit</button>
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from "react";
import tracker from "./tracker";

export function useTracker() {
  const track = useCallback((name, props) => tracker.track(name, props), []);
  const click = useCallback((id, props) => tracker.click(id, props), []);
  const page = useCallback((path, props) => tracker.page(path, props), []);
  const action = useCallback((name, props) => tracker.action(name, props), []);
  const form = useCallback(
    (name, action, props) => tracker.form(name, action, props),
    [],
  );

  return { track, click, page, action, form, tracker };
}

export default useTracker;
