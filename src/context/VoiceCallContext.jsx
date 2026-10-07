// src/context/VoiceCallContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global voice-call state. Lives at the app root so the call survives route
// changes.
//
// This is the single source of truth for:
//   • Which call is currently in progress (call)
//   • Which UI mode we're in (mode: "hidden" | "fullscreen" | "mini")
//
// Everything that mutates call state goes through the setCall helper, so
// every state change is logged with the same format (and can be filtered).
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";

// Toggle verbose logging with this constant. Set to false in a future commit.
const DEBUG_VOICE_CALL = true;

function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCC ${ts}]`, ...args);
}

const VoiceCallContext = createContext(null);

export function VoiceCallProvider({ children }) {
  const [call, setCallState] = useState(null);
  const [mode, setModeState] = useState("hidden");

  // Keep a ref of the current call so we can log transitions accurately.
  const callRef = useRef(null);

  // ── Internal setter: always log the full call shape ────────────────────
  const setCall = useCallback((next) => {
    if (next) {
      log("setCall →", {
        id: next.id,
        status: next.status,
        initiatorId: next.initiatorId,
        receiverId: next.receiverId,
        conversationId: next.conversationId,
        callType: next.callType,
      });
    } else {
      log("setCall → null");
    }
    callRef.current = next;
    setCallState(next);
  }, []);

  // ── Public API ────────────────────────────────────────────────────────
  const startCall = useCallback(
    (nextCall) => {
      log("startCall()", {
        id: nextCall?.id,
        status: nextCall?.status,
        initiatorId: nextCall?.initiatorId,
      });
      setCall(nextCall);
      setModeState("fullscreen");
    },
    [setCall],
  );

  const openCall = useCallback(
    (nextCall) => {
      log("openCall()", {
        id: nextCall?.id,
        status: nextCall?.status,
        initiatorId: nextCall?.initiatorId,
      });
      setCall(nextCall);
      setModeState("fullscreen");
    },
    [setCall],
  );

  const updateCall = useCallback((patch) => {
    setCallState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (prev.status !== next.status) {
        log(`status ${prev.status} → ${next.status}`, {
          id: next.id,
          initiatorId: next.initiatorId,
          receiverId: next.receiverId,
        });
      }
      callRef.current = next;
      return next;
    });
  }, []);

  const minimize = useCallback(() => {
    log("minimize()");
    setModeState("mini");
  }, []);

  const expand = useCallback(() => {
    log("expand()");
    setModeState("fullscreen");
  }, []);

  const endCall = useCallback(() => {
    log("endCall()");
    callRef.current = null;
    setCallState(null);
    setModeState("hidden");
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
  if (!ctx) {
    throw new Error("useVoiceCall must be used inside <VoiceCallProvider>");
  }
  return ctx;
}
