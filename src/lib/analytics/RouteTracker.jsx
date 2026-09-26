// src/lib/analytics/RouteTracker.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Mount <RouteTracker /> once, INSIDE <BrowserRouter>. It listens to location
// changes and emits page.view + page.leave events automatically.
//
// Also resets scroll milestones on each route change so a new page fires its
// own 25/50/75/100 scroll events.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import tracker from "./tracker";
import { resetScrollMilestones } from "./autoTrack";

export default function RouteTracker() {
  const location = useLocation();
  const lastPath = useRef(null);
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    const path = location.pathname + (location.search || "");
    const now = Date.now();

    // Emit leave for the previous page
    if (lastPath.current && lastPath.current !== path) {
      tracker.track("page.leave", {
        path: lastPath.current,
        durationMs: now - enteredAt.current,
      });
    }

    // Emit view for the new page
    tracker.page(path, {
      title: typeof document !== "undefined" ? document.title : null,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
    });

    resetScrollMilestones();

    lastPath.current = path;
    enteredAt.current = now;

    return () => {
      // Fire leave on unmount (route change unmounts the previous RouteTracker
      // only if it's keyed — but with a single RouteTracker instance mounted
      // inside the Router, this effect re-runs on every path change and the
      // cleanup runs before the next effect. That's the correct ordering.)
      tracker.track("page.leave", {
        path,
        durationMs: Date.now() - enteredAt.current,
      });
    };
  }, [location.pathname, location.search]);

  return null;
}
