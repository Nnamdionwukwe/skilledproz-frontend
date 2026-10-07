// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Persistent voice-call widget. Mounted once at the app root.
//
// Owns:
//   • useVoiceCallWebRTC (the peer connection + signaling)
//   • Polling /voice-calls/:conversationId for state changes
//   • A hidden <audio> element that plays the remote stream
//   • Switching between full-screen and mini UI based on context.mode
//
// RACE SAFETY:
//   Once a call has been observed ACTIVE, we latch a sticky flag so that a
//   racing poll (or a duplicate initiate that briefly flips status back to
//   PENDING) cannot tear down the WebRTC hook mid-call. The flag clears
//   only when the call object itself is cleared (call ended / declined).
//
// AUDIO PLAYBACK NOTES:
//   1. The <audio> element is positioned off-screen, NOT display:none.
//      Some browsers (Safari especially) refuse to play fully-hidden media.
//   2. We re-attach srcObject whenever the remote stream changes AND on
//      every addtrack event — belt and braces to survive async track arrival.
//   3. If autoplay is blocked (no user gesture yet), we retry on the next
//      click anywhere on the page.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
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

  // ── Sticky active flag ─────────────────────────────────────────────────
  // Once we've seen the call go ACTIVE, remember it. If a racing poll (or
  // a duplicate initiate) briefly reports PENDING, we keep the WebRTC hook
  // alive. Cleared only when the call object is cleared.
  const [everActive, setEverActive] = useState(false);
  useEffect(() => {
    if (isActive) setEverActive(true);
  }, [isActive]);
  useEffect(() => {
    if (!call) setEverActive(false);
  }, [call]);

  const effectiveActive = isActive || everActive;

  // WebRTC hook only spins up once we know the call is (or was) active.
  const rtc = useVoiceCallWebRTC({
    conversationId: effectiveActive ? call?.conversationId : null,
    isInitiator,
  });

  // ── Attach remote stream to <audio> ────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const attach = () => {
      if (!rtc.remoteStream) {
        el.srcObject = null;
        return;
      }
      if (el.srcObject !== rtc.remoteStream) {
        el.srcObject = rtc.remoteStream;
      }
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch((e) => {
          console.warn("[voice] autoplay blocked:", e.message);
          const resume = () => {
            el.play().catch(() => {});
            window.removeEventListener("click", resume);
            window.removeEventListener("keydown", resume);
          };
          window.addEventListener("click", resume, { once: true });
          window.addEventListener("keydown", resume, { once: true });
        });
      }
    };

    attach();

    const stream = rtc.remoteStream;
    if (stream) {
      const onAddTrack = () => {
        console.log("[voice] remote addtrack — re-attaching audio");
        attach();
      };
      stream.addEventListener("addtrack", onAddTrack);
      return () => {
        stream.removeEventListener("addtrack", onAddTrack);
      };
    }
  }, [rtc.remoteStream]);

  // ── Poll for status changes ────────────────────────────────────────────
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
      {/*
        Hidden audio sink — must NOT be display:none.
        Placing it 1×1 off-screen keeps it "visible" to the browser so
        autoplay policies treat it like any other media element.
      */}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        aria-hidden="true"
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: "none",
          top: 0,
          left: 0,
          border: 0,
        }}
      />

      {mode === "fullscreen" && <VoiceCallFullScreen rtc={rtc} />}
      {mode === "mini" && <VoiceCallMini rtc={rtc} />}
    </>
  );
}
