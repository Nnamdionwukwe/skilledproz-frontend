// src/context/VoiceCallContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global voice-call state. Lives at the app root so the call survives route
// changes. Any component can:
//
//   const { startCall, openCall, minimize, expand, endCall, call, mode } =
//     useVoiceCall();
//
// Modes:
//   "hidden"      → no call in progress
//   "fullscreen"  → the big full-screen call UI
//   "mini"        → the small floating widget, user can browse the app
//
// The actual MiroTalk iframe is owned by <VoiceCallProvider>, mounted once
// at the root. This context only holds state.
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
  const [callUrl, setCallUrl] = useState(null);
  const [mode, setMode] = useState("hidden");

  // Caller side: user just clicked 📞.
  const startCall = useCallback((nextCall, nextCallUrl) => {
    setCall(nextCall);
    setCallUrl(nextCallUrl || null);
    setMode("fullscreen");
  }, []);

  // Receiver side: user accepted an incoming banner.
  const openCall = useCallback((nextCall, nextCallUrl) => {
    setCall(nextCall);
    setCallUrl(nextCallUrl || null);
    setMode("fullscreen");
  }, []);

  const updateCall = useCallback((patch) => {
    setCall((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const minimize = useCallback(() => setMode("mini"), []);
  const expand = useCallback(() => setMode("fullscreen"), []);

  const endCall = useCallback(() => {
    setCall(null);
    setCallUrl(null);
    setMode("hidden");
  }, []);

  const value = useMemo(
    () => ({
      call,
      callUrl,
      mode,
      startCall,
      openCall,
      updateCall,
      minimize,
      expand,
      endCall,
      setCallUrl,
    }),
    [
      call,
      callUrl,
      mode,
      startCall,
      openCall,
      updateCall,
      minimize,
      expand,
      endCall,
    ],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error("useVoiceCall must be used inside <VoiceCallProvider>");
  }
  return ctx;
}
