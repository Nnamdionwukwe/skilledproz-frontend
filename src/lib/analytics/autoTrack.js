// src/lib/analytics/autoTrack.js
// ─────────────────────────────────────────────────────────────────────────────
// Global, one-time event listeners for:
//   * clicks on any [data-track-id] element
//   * scroll depth milestones (25 / 50 / 75 / 100)
//   * uncaught client errors
//
// Call `initAutoTrack()` exactly once, near app bootstrap (src/main.jsx).
// Everything else is silent — no component changes needed.
// ─────────────────────────────────────────────────────────────────────────────

import tracker from "./tracker";

let initialized = false;

const SCROLL_DEPTHS = [25, 50, 75, 100];
const firedDepth = new Set();

function readScrollPct() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const viewport = window.innerHeight || doc.clientHeight || 0;
  const totalHeight = Math.max(
    body.scrollHeight || 0,
    doc.scrollHeight || 0,
    body.offsetHeight || 0,
    doc.offsetHeight || 0,
  );
  if (totalHeight <= viewport) return 100;
  return Math.min(
    100,
    Math.round(((scrollTop + viewport) / totalHeight) * 100),
  );
}

function onScroll() {
  const pct = readScrollPct();
  for (const d of SCROLL_DEPTHS) {
    if (pct >= d && !firedDepth.has(d)) {
      firedDepth.add(d);
      tracker.scroll(d, { path: window.location.pathname });
    }
  }
}

function onClick(e) {
  const el = e.target?.closest?.("[data-track-id]");
  if (!el) return;
  const elementId = el.getAttribute("data-track-id");
  if (!elementId) return;

  const elementType =
    el.tagName === "BUTTON"
      ? "button"
      : el.tagName === "A"
        ? "link"
        : el.tagName === "FORM"
          ? "form"
          : el.tagName === "INPUT" || el.tagName === "TEXTAREA"
            ? "input"
            : "other";

  tracker.click(elementId, {
    elementType,
    path: window.location.pathname,
    text: (el.innerText || "").slice(0, 60),
  });
}

function onSubmit(e) {
  const el = e.target?.closest?.("[data-track-id]");
  if (!el) return;
  const elementId = el.getAttribute("data-track-id");
  if (!elementId) return;

  tracker.form(elementId, "submit", { path: window.location.pathname });
}

function onError(event) {
  // Only log actual JS errors, not resource 404s
  if (event.message) {
    tracker.error(event.message.slice(0, 200), {
      path: window.location.pathname,
      source: event.filename?.split("/").pop() || null,
      line: event.lineno || null,
    });
  }
}

function onUnhandledRejection(event) {
  const reason = event.reason;
  const message =
    typeof reason === "string"
      ? reason
      : reason?.message || "Unhandled promise rejection";
  tracker.error(message.slice(0, 200), {
    path: window.location.pathname,
    kind: "unhandledrejection",
  });
}

/**
 * Attach all global listeners exactly once.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initAutoTrack() {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  document.addEventListener("click", onClick, { capture: true });
  document.addEventListener("submit", onSubmit, { capture: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
}

/** Reset scroll milestones — call after route change so each page
 *  can fire its own scroll.depth events. */
export function resetScrollMilestones() {
  firedDepth.clear();
}
