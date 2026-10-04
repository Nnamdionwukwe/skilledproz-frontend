// src/lib/voiceSocket.js
// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO client for the voice-call signaling namespace.
//
// The backend exposes a dedicated namespace at <API_URL>/voice-calls which
// relays WebRTC offers, answers, and ICE candidates between the two
// participants of a call.
//
// Usage:
//   const socket = getVoiceSocket();
//   socket.emit("voice:join", { conversationId }, (resp) => { ... });
//
// There's exactly ONE socket per browser tab. Calling getVoiceSocket() a
// second time returns the same instance.
// ─────────────────────────────────────────────────────────────────────────────

import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

// VITE_API_URL includes "/api" for HTTP requests, but the socket.io
// namespace lives at the server root — strip the trailing "/api".
const API_BASE = (
  import.meta.env.VITE_API_URL || "https://api.skilledproz.com"
).replace(/\/api\/?$/, "");

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

  socket = io(`${API_BASE}/voice-calls`, {
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
