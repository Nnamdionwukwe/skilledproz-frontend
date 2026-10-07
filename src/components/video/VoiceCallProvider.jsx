// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Persistent voice-call widget. Mounted once at the app root.
//
// Ownership:
//   • useVoiceCallWebRTC (the peer connection + signaling)
//   • Polling /voice-calls/:conversationId for state changes
//   • A hidden <audio> element that plays the remote stream
//   • Switching between full-screen and mini UI based on context.mode
//
// THE FIX FOR SILENT CALLS:
//   isInitiator is passed to the hook as a GETTER, not a value. The hook
//   reads it synchronously inside socket handlers, so it always sees the
//   CURRENT value of (call.initiatorId === user.id) — never a stale
//   captured value from an earlier render. This is what made the caller's
//   offer never get sent.
//
// STICKY ACTIVE:
//   Once a call has been ACTIVE, we latch a flag so a racing poll can't
//   tear down WebRTC. Cleared when call goes to null.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
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

  // ── Sticky active flag ─────────────────────────────────────────────────
  const [everActive, setEverActive] = useState(false);
  useEffect(() => {
    if (isActive) setEverActive(true);
  }, [isActive]);
  useEffect(() => {
    if (!call) setEverActive(false);
  }, [call]);

  const effectiveActive = isActive || everActive;

  // ── Synchronous isInitiator getter ────────────────────────────────────
  // We pass a GETTER to the hook instead of a value. The getter reads the
  // latest `call` and `user` from refs, so it's never stale. Every place
  // the hook needs to know "am I the initiator right now" it calls this.
  const callRef = useRef(call);
  const userRef = useRef(user);
  useEffect(() => {
    callRef.current = call;
  }, [call]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getIsInitiator = useCallback(() => {
    const c = callRef.current;
    const u = userRef.current;
    return !!(c && u && c.initiatorId === u.id);
  }, []);

  // Diagnostic — prints every time the effective initiator changes.
  // Remove this in a follow-up once we're confident the fix holds.
  useEffect(() => {
    console.log(
      "[voice] provider state — user.id:",
      user?.id,
      "call.initiatorId:",
      call?.initiatorId,
      "getIsInitiator():",
      getIsInitiator(),
    );
  }, [user?.id, call?.initiatorId, getIsInitiator]);

  const rtc = useVoiceCallWebRTC({
    conversationId: effectiveActive ? call?.conversationId : null,
    getIsInitiator,
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
