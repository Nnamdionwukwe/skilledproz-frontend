// src/lib/analytics/tracker.js
// ─────────────────────────────────────────────────────────────────────────────
// Client-side event tracker.
//
// - Generates + persists sessionId (per tab) and anonymousId (per browser)
// - Buffers events in memory, flushes to the backend every 5s or on 50 events
// - Uses navigator.sendBeacon() on page unload so nothing is lost
// - Never blocks the app: fire-and-forget, errors are swallowed
// - Respects an opt-out flag in localStorage ("sp_track_optout" === "1")
// - Uses a bare axios instance (NOT src/lib/api.js) so that:
//     * the tracker never triggers the 401 → refresh flow
//     * batch failures don't interfere with app requests
//     * the tracker can send its own Authorization header on demand
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 50;
const MAX_QUEUE = 200;

// Bare axios instance — no interceptors, no shared auth, just this.
const http = axios.create({ baseURL: API_BASE, timeout: 8000 });

// ── Storage helpers ───────────────────────────────────────────────────────────
function safeGet(store, key) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store, key, val) {
  try {
    store.setItem(key, val);
  } catch {
    /* quota / private mode */
  }
}
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Tracker class ─────────────────────────────────────────────────────────────
class Tracker {
  constructor() {
    this.queue = [];
    this.userId = null;
    this.flushTimer = null;
    this.flushersAttached = false;
    this.optOut = safeGet(localStorage, "sp_track_optout") === "1";

    // Session ID lives in sessionStorage — resets on tab close.
    // Anonymous ID lives in localStorage — survives across sessions.
    this.sessionId = this._getOrCreate(sessionStorage, "sp_session_id", uuid);
    this.anonymousId = this._getOrCreate(localStorage, "sp_anon_id", uuid);
  }

  _getOrCreate(store, key, factory) {
    let id = safeGet(store, key);
    if (!id) {
      id = factory();
      safeSet(store, key, id);
    }
    return id;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Called by the app when a user logs in. Flushes immediately so events
   *  after this point are attributed to the user, not the anonymous ID. */
  identify(userId) {
    if (!userId || userId === this.userId) return;
    this.userId = userId;
    this.flush("identify");
  }

  /** Called by the app when a user logs out. */
  unidentify() {
    this.flush("unidentify");
    this.userId = null;
    // Rotate session so post-logout anonymous traffic isn't attributed to the
    // previous user.
    this.sessionId = uuid();
    safeSet(sessionStorage, "sp_session_id", this.sessionId);
  }

  /** Set or clear the opt-out flag. */
  setOptOut(value) {
    this.optOut = !!value;
    safeSet(localStorage, "sp_track_optout", this.optOut ? "1" : "0");
    if (this.optOut) {
      this.queue = [];
    }
  }

  isOptedOut() {
    return this.optOut;
  }

  // ── Event emitters ──────────────────────────────────────────────────────────

  page(path, props = {}) {
    this._push("page.view", { path, ...props });
  }

  track(name, props = {}) {
    this._push(name, props);
  }

  click(elementId, props = {}) {
    this._push("button.click", { elementId, ...props });
  }

  form(name, action, props = {}) {
    this._push(`form.${action}`, { form: name, ...props });
  }

  scroll(depthPct, props = {}) {
    this._push("scroll.depth", { depth: depthPct, ...props });
  }

  error(message, props = {}) {
    this._push("error.shown", { message, ...props });
  }

  /** Attach to a component — flushes immediately so results are captured
   *  even if the user closes the tab right after. */
  action(name, props = {}) {
    this._push(name, props);
    this.flush("action");
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  _push(name, props) {
    if (this.optOut) return;
    this.queue.push({
      name,
      props: this._sanitize(props),
      ts: Date.now(),
    });
    if (this.queue.length >= FLUSH_THRESHOLD) {
      this.flush("threshold");
    }
    this._attachFlushers();
  }

  _sanitize(props) {
    if (!props || typeof props !== "object") return {};
    const SENSITIVE = new Set([
      "password",
      "confirmPassword",
      "currentPassword",
      "newPassword",
      "token",
      "accessToken",
      "refreshToken",
      "jwt",
      "authorization",
      "cardNumber",
      "cvv",
      "cvc",
      "ssn",
      "pin",
      "withdrawalPin",
    ]);
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      if (SENSITIVE.has(k)) continue;
      if (typeof v === "string" && v.length > 500) {
        out[k] = v.slice(0, 500);
      } else if (Array.isArray(v)) {
        out[k] = v.slice(0, 20);
      } else if (v && typeof v === "object") {
        out[k] = this._sanitize(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  _payload(reason) {
    return {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      userId: this.userId,
      events: this.queue.slice(0, MAX_QUEUE),
      reason,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
    };
  }

  _authHeader() {
    try {
      const token = localStorage.getItem("accessToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  async flush(reason = "manual") {
    if (this.optOut) return;
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.queue.length);
    const payload = {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      userId: this.userId,
      events: batch,
      reason,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
    };

    try {
      await http.post("/analytics/events", payload, {
        headers: { "Content-Type": "application/json", ...this._authHeader() },
      });
    } catch {
      // Re-queue but cap it to avoid runaway growth
      this.queue.unshift(...batch);
      if (this.queue.length > MAX_QUEUE) {
        this.queue = this.queue.slice(-MAX_QUEUE);
      }
    }
  }

  _attachFlushers() {
    if (this.flushersAttached) return;
    if (typeof window === "undefined") return;
    this.flushersAttached = true;

    // Interval flush
    this.flushTimer = setInterval(
      () => this.flush("interval"),
      FLUSH_INTERVAL_MS,
    );

    // Flush when tab is hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flush("hidden");
    });

    // Flush on unload using sendBeacon (survives page close)
    window.addEventListener("pagehide", () => this._beaconFlush());
    window.addEventListener("beforeunload", () => this._beaconFlush());
  }

  _beaconFlush() {
    if (this.optOut) return;
    if (this.queue.length === 0) return;
    if (!navigator.sendBeacon) return;

    const payload = JSON.stringify({
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      userId: this.userId,
      events: this.queue.slice(0, MAX_QUEUE),
      reason: "unload",
      path: window.location.pathname,
      referrer: document.referrer || null,
    });

    try {
      // sendBeacon cannot set an Authorization header; the endpoint uses
      // optionalProtect so anonymous/beacon events still land, attributed to
      // anonymousId. If the user is logged in, the last interval flush
      // (which DOES include the token) will have already covered most events.
      const ok = navigator.sendBeacon(
        `${API_BASE}/analytics/events`,
        new Blob([payload], { type: "application/json" }),
      );
      if (ok) this.queue = [];
    } catch {
      // swallow
    }
  }
}

export const tracker = new Tracker();
export default tracker;
