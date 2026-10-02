// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Persistent voice-call widget. Mounted once at the app root.
//
// Owns:
//   • useVoiceCallWebRTC (the peer connection + signaling)
//   • Polling /voice-calls/:conversationId for state changes (accept, end, etc.)
//   • A hidden <audio> element that plays the remote stream
//   • Switching between full-screen and mini UI based on context.mode
//
// Because it lives at the root, the call survives navigation.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import useVoiceCallWebRTC from "../../hooks/useVoiceCallWebRTC";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";

const POLL_MS = 3000;

export default function VoiceCallProvider() {
  const { user, accessToken, isHydrated } = useAuthStore();
  const { call, mode, updateCall, endCall } = useVoiceCall();

  const audioRef = useRef(null);
  const inFlightRef = useRef(false);

  const isActive = call?.status === "ACTIVE";
  const isInitiator = call?.initiatorId === user?.id;

  // WebRTC only spins up when the call is ACTIVE.
  const rtc = useVoiceCallWebRTC({
    conversationId: isActive ? call?.conversationId : null,
    isInitiator,
  });

  // Attach remote stream to the hidden <audio> element.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (rtc.remoteStream) {
      el.srcObject = rtc.remoteStream;
      el.play().catch((e) => console.warn("[voice] autoplay blocked:", e));
    } else {
      el.srcObject = null;
    }
  }, [rtc.remoteStream]);

  // Poll for status changes.
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (!call?.conversationId) return;

    let cancelled = false;
    const conversationId = call.conversationId;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await api.get(`/voice-calls/${conversationId}`);
        const data = res.data.data;
        if (cancelled) return;

        if (!data?.call) {
          endCall();
          return;
        }
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
          endCall();
          return;
        }
        updateCall(data.call);
      } catch {
        /* noop */
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken, user?.id, call?.conversationId]);

  if (!call || mode === "hidden") return null;

  return (
    <>
      {/* Hidden audio sink — plays the remote peer's voice */}
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {mode === "fullscreen" && <VoiceCallFullScreen rtc={rtc} />}
      {mode === "mini" && <VoiceCallMini rtc={rtc} />}
    </>
  );
}
