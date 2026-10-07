// src/lib/voiceSocket.js
// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO client for the voice-call signaling namespace.
//
// NOTE: VITE_API_URL is set to "https://api.skilledproz.com/api" (with /api)
// for the HTTP client. But the Socket.IO namespace lives at the server root:
//   ✅ https://api.skilledproz.com/voice-calls
//   ❌ https://api.skilledproz.com/api/voice-calls
// So we strip a trailing "/api" from VITE_API_URL before building the
// socket URL.
//
// RECONNECT STRATEGY:
//   • WebSocket preferred, polling as fallback (some corporate proxies
//     block the WS upgrade).
//   • On disconnect we keep the socket object around and let Socket.IO
//     handle reconnection. Callers should NOT call getVoiceSocket() while
//     a socket exists — the returned instance will be reused and its
//     internal state (connected flag, reconnect timer) is preserved.
//   • Only on explicit disconnectVoiceSocket() do we tear it down.
// ─────────────────────────────────────────────────────────────────────────────

import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "https://api.skilledproz.com";

// Strip a trailing "/api" or "/api/" so the socket connects to the server
// root (where the namespace is registered), not to /api/voice-calls.
const SOCKET_BASE = RAW_API_URL.replace(/\/api\/?$/, "");

let socket = null;

/**
 * Return the shared voice-call socket.
 *
 * If the socket exists (even mid-reconnect), we return the SAME instance.
 * Creating a new one while a previous one is trying to reconnect would
 * cause duplicate connections, duplicate room joins, and — worse — the
 * server would kick the first one when the second arrives on the same
 * namespace for the same user, potentially mid-handshake.
 *
 * Only after an explicit disconnectVoiceSocket() do we create a new one.
 */
export function getVoiceSocket() {
  if (socket) return socket;

  const token = useAuthStore.getState().accessToken;
  if (!token) {
    console.warn("[voiceSocket] no auth token — cannot connect");
    return null;
  }

  const url = `${SOCKET_BASE}/voice-calls`;
  console.log("[voiceSocket] creating socket →", url);

  socket = io(url, {
    auth: { token },
    // Prefer WebSocket for lowest latency, fall back to polling if
    // WebSocket is blocked. Do NOT force ["websocket"] — behind some
    // proxies that kills the connection.
    transports: ["websocket", "polling"],
    upgrade: true,

    // ── Reconnect tuning for mobile ───────────────────────────────────
    reconnection: true,
    reconnectionDelay: 800, // start faster
    reconnectionDelayMax: 4000,
    reconnectionAttempts: 50, // keep trying for a long time
    randomizationFactor: 0.3, // jitter to avoid thundering herd

    // Give the transport a longer window before declaring failure.
    // Mobile networks are slow; 10s was too aggressive.
    timeout: 20000,

    // ── Heartbeat (client-side) ───────────────────────────────────────
    // Must match / be compatible with the server's pingInterval/pingTimeout.
    // Server drives these — client just needs to be tolerant.
    // (Socket.IO v4 doesn't let the client override these; they come
    //  from the server handshake. Left here as a reminder.)
  });

  socket.on("connect", () => {
    console.log("[voiceSocket] connected:", socket.id);
  });

  socket.on("reconnect", (attempt) => {
    console.log("[voiceSocket] reconnected after", attempt, "attempts");
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log("[voiceSocket] reconnect attempt:", attempt);
  });

  socket.on("connect_error", (err) => {
    console.error("[voiceSocket] connect_error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[voiceSocket] disconnected:", reason);
    // Socket.IO will attempt to reconnect automatically unless the server
    // sent a namespace disconnect. In that case, reconnect won't work
    // unless we manually reconnect — do it here for robustness.
    if (reason === "io server disconnect") {
      console.log("[voiceSocket] server kicked us — reconnecting manually");
      socket.connect();
    }
  });

  return socket;
}

/**
 * Only call this on hard cleanup (logout, component unmount that must
 * end the session). In normal flows, keep the socket alive so reconnects
 * are seamless.
 */
export function disconnectVoiceSocket() {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
