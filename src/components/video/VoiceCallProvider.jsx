// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Persistent voice-call widget.
// LOG PREFIX: [VCP] (Voice Call Provider)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import useVoiceCallWebRTC from "../../hooks/useVoiceCallWebRTC";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";

const POLL_MS = 3000;

function ts() {
  return new Date().toISOString().slice(11, 23);
}

export default function VoiceCallProvider() {
  const { user, accessToken, isHydrated } = useAuthStore();
  const { call, mode, updateCall, endCall } = useVoiceCall();

  const audioRef = useRef(null);
  const inFlightRef = useRef(false);

  const isActive = call?.status === "ACTIVE";

  // Sticky active flag
  const [everActive, setEverActive] = useState(false);
  useEffect(() => {
    if (isActive) setEverActive(true);
  }, [isActive]);
  useEffect(() => {
    if (!call) setEverActive(false);
  }, [call]);

  const effectiveActive = isActive || everActive;

  // Refs so the getter can read fresh values without re-creating itself.
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

  // ── Diagnostics ───────────────────────────────────────────────────────
  useEffect(() => {
    console.log(`[VCP ${ts()}] state —`, {
      userId: user?.id,
      callStatus: call?.status,
      callInitiatorId: call?.initiatorId,
      callReceiverId: call?.receiverId,
      isActive,
      everActive,
      effectiveActive,
      getIsInitiator: getIsInitiator(),
    });
  }, [
    user?.id,
    call?.status,
    call?.initiatorId,
    call?.receiverId,
    isActive,
    everActive,
    effectiveActive,
    getIsInitiator,
  ]);

  const rtc = useVoiceCallWebRTC({
    conversationId: effectiveActive ? call?.conversationId : null,
    getIsInitiator,
  });

  // Attach remote stream to <audio>
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const attach = () => {
      if (!rtc.remoteStream) {
        el.srcObject = null;
        return;
      }
      if (el.srcObject !== rtc.remoteStream) {
        console.log(`[VCP ${ts()}] attaching remote stream to <audio>`);
        el.srcObject = rtc.remoteStream;
      }
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch((e) => {
          console.warn(`[VCP ${ts()}] autoplay blocked:`, e.message);
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
        console.log(`[VCP ${ts()}] remote addtrack — re-attaching`);
        attach();
      };
      stream.addEventListener("addtrack", onAddTrack);
      return () => {
        stream.removeEventListener("addtrack", onAddTrack);
      };
    }
  }, [rtc.remoteStream]);

  // Poll for status changes
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
          console.log(`[VCP ${ts()}] poll: no call — endCall()`);
          endCall();
          return;
        }
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
          console.log(
            `[VCP ${ts()}] poll: status=${data.call.status} — endCall()`,
          );
          endCall();
          return;
        }
        console.log(`[VCP ${ts()}] poll: status=${data.call.status}`);
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
