// src/context/VoiceCallContext.jsx
// LOG PREFIX: [VCC] (Voice Call Context)
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

function ts() {
  return new Date().toISOString().slice(11, 23);
}

const VoiceCallContext = createContext(null);

export function VoiceCallProvider({ children }) {
  const [call, setCallState] = useState(null);
  const [mode, setModeState] = useState("hidden");

  const setCall = useCallback((next) => {
    console.log(
      `[VCC ${ts()}] setCall →`,
      next
        ? {
            id: next.id,
            status: next.status,
            initiatorId: next.initiatorId,
            receiverId: next.receiverId,
            callType: next.callType,
          }
        : null,
    );
    setCallState(next);
  }, []);

  const startCall = useCallback(
    (nextCall) => {
      console.log(`[VCC ${ts()}] startCall()`, {
        id: nextCall?.id,
        initiatorId: nextCall?.initiatorId,
      });
      setCall(nextCall);
      setModeState("fullscreen");
    },
    [setCall],
  );

  const openCall = useCallback(
    (nextCall) => {
      console.log(`[VCC ${ts()}] openCall()`, {
        id: nextCall?.id,
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
        console.log(`[VCC ${ts()}] status ${prev.status} → ${next.status}`);
      }
      return next;
    });
  }, []);

  const minimize = useCallback(() => {
    console.log(`[VCC ${ts()}] minimize()`);
    setModeState("mini");
  }, []);

  const expand = useCallback(() => {
    console.log(`[VCC ${ts()}] expand()`);
    setModeState("fullscreen");
  }, []);

  const endCall = useCallback(() => {
    console.log(`[VCC ${ts()}] endCall()`);
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
  if (!ctx)
    throw new Error("useVoiceCall must be used inside VoiceCallProvider");
  return ctx;
}
