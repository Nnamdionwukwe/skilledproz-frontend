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
// ─────────────────────────────────────────────────────────────────────────────

import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "https://api.skilledproz.com";

// Strip a trailing "/api" or "/api/" so the socket connects to the server
// root (where the namespace is registered), not to /api/voice-calls.
const SOCKET_BASE = RAW_API_URL.replace(/\/api\/?$/, "");

let socket = null;

export function getVoiceSocket() {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = useAuthStore.getState().accessToken;
  if (!token) {
    console.warn("[voiceSocket] no auth token — cannot connect");
    return null;
  }

  const url = `${SOCKET_BASE}/voice-calls`;
  console.log("[voiceSocket] connecting to:", url);

  socket = io(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("[voiceSocket] connected:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[voiceSocket] connect_error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[voiceSocket] disconnected:", reason);
  });

  return socket;
}

export function disconnectVoiceSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
