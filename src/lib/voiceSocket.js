// src/lib/voiceSocket.js
// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO client for the voice-call signaling namespace.
//
// LOG PREFIX: [VS] (Voice Socket)
// ─────────────────────────────────────────────────────────────────────────────

import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "https://api.skilledproz.com";

const SOCKET_BASE = RAW_API_URL.replace(/\/api\/?$/, "");

let socket = null;

function ts() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

export function getVoiceSocket() {
  if (socket) {
    console.log(`[VS ${ts()}] getVoiceSocket() — returning existing socket`, {
      connected: socket.connected,
      id: socket.id,
    });
    return socket;
  }

  const token = useAuthStore.getState().accessToken;
  console.log(`[VS ${ts()}] getVoiceSocket() — creating NEW socket`, {
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 20) + "..." : null,
  });

  if (!token) {
    console.warn(`[VS ${ts()}] no auth token — cannot connect`);
    return null;
  }

  const url = `${SOCKET_BASE}/voice-calls`;
  console.log(`[VS ${ts()}] connecting → ${url}`);

  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    reconnectionAttempts: 50,
    randomizationFactor: 0.3,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log(`[VS ${ts()}] ✅ connected`, { id: socket.id });
  });

  socket.on("reconnect", (attempt) => {
    console.log(`[VS ${ts()}] 🔄 reconnected after`, attempt, "attempts", {
      id: socket.id,
    });
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log(`[VS ${ts()}] reconnect attempt #${attempt}`);
  });

  socket.on("connect_error", (err) => {
    console.error(`[VS ${ts()}] ❌ connect_error:`, err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[VS ${ts()}] ⚠️ disconnected:`, reason);
    if (reason === "io server disconnect") {
      console.log(`[VS ${ts()}] server kicked us — reconnecting manually`);
      socket.connect();
    }
  });

  return socket;
}

export function disconnectVoiceSocket() {
  console.log(`[VS ${ts()}] disconnectVoiceSocket() called`);
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
