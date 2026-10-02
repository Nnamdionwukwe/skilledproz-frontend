// src/context/VoiceCallContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global voice-call state. Mounted once at the app root so the call survives
// route changes.
//
//   hidden      — no call in progress
//   fullscreen  — the large call UI
//   mini        — small floating widget, user can browse the app
//
// The actual RTCPeerConnection and MiroTalk-free signaling live in
// <VoiceCallProvider>, which reads from this context.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

const VoiceCallContext = createContext(null);

export function VoiceCallProvider({ children }) {
  const [call, setCall] = useState(null);
  const [mode, setMode] = useState("hidden");

  const startCall = useCallback((nextCall) => {
    setCall(nextCall);
    setMode("fullscreen");
  }, []);

  const openCall = useCallback((nextCall) => {
    setCall(nextCall);
    setMode("fullscreen");
  }, []);

  const updateCall = useCallback((patch) => {
    setCall((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const minimize = useCallback(() => setMode("mini"), []);
  const expand = useCallback(() => setMode("fullscreen"), []);
  const endCall = useCallback(() => {
    setCall(null);
    setMode("hidden");
  }, []);

  const value = useMemo(
    () => ({
      call,
      mode,
      startCall,
      openCall,
      updateCall,
      minimize,
      expand,
      endCall,
    }),
    [call, mode, startCall, openCall, updateCall, minimize, expand, endCall],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx)
    throw new Error("useVoiceCall must be used inside VoiceCallProvider");
  return ctx;
}
