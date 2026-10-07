// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Persistent voice-call widget. Mounted once at the app root.
//
// Responsibilities:
//   • Spin up useVoiceCallWebRTC on BOTH sides of the call
//   • Poll /voice-calls/:conversationId to keep context fresh
//   • Play the remote audio stream via a hidden <audio> element
//   • Render full-screen or mini UI based on context mode
//
// CRITICAL: this component is what runs the WebRTC hook. If it doesn't run
// on the receiver's device, the receiver never joins the room and the
// caller never gets a peer-joined event — the call stays silent.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import useVoiceCallWebRTC from "../../hooks/useVoiceCallWebRTC";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";

const POLL_MS = 3000;

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCP ${ts}]`, ...args);
}

export default function VoiceCallProvider() {
  const { user, accessToken, isHydrated } = useAuthStore();
  const { call, mode, updateCall, endCall } = useVoiceCall();

  const audioRef = useRef(null);
  const inFlightRef = useRef(false);

  const isActive = call?.status === "ACTIVE";

  // Sticky flag: once we've seen ACTIVE, keep the hook alive even if a
  // racing poll briefly reports PENDING.
  const [everActive, setEverActive] = useState(false);
  useEffect(() => {
    if (isActive) setEverActive(true);
  }, [isActive]);
  useEffect(() => {
    if (!call) setEverActive(false);
  }, [call]);

  // Keep refs of the current call + user so the isInitiator getter always
  // reads fresh values. This is what makes the callback safe across
  // re-renders.
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

  // The hook runs whenever we have a call AND its conversationId is set.
  // We deliberately do NOT gate on isActive — a PENDING call still needs
  // the caller to be connected so when the receiver joins they can be
  // signalled. And on the receiver side, ACTIVE is what opens the
  // conversationId, but we want the hook ready either way.
  const hookConversationId = call?.conversationId || null;
  const effectiveActive = isActive || everActive;

  // ── Diagnostic: log state once per meaningful change ──────────────────
  useEffect(() => {
    if (!call) return;
    log("state", {
      userId: user?.id,
      callId: call.id,
      callStatus: call.status,
      initiatorId: call.initiatorId,
      receiverId: call.receiverId,
      conversationId: call.conversationId,
      isActive,
      everActive,
      effectiveActive,
      getIsInitiator: getIsInitiator(),
    });
  }, [user?.id, call, isActive, everActive, effectiveActive, getIsInitiator]);

  const rtc = useVoiceCallWebRTC({
    conversationId: hookConversationId,
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
        log("attaching remote stream to <audio>");
        el.srcObject = rtc.remoteStream;
      }
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch((e) => {
          console.warn("[VCP] autoplay blocked:", e.message);
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
        log("remote addtrack — re-attaching");
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
          log("poll: no call row → endCall()");
          endCall();
          return;
        }
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
          log(`poll: status=${data.call.status} → endCall()`);
          endCall();
          return;
        }

        // Only update if something actually changed. Prevents context
        // churn from a poll that returns identical data.
        const current = callRef.current;
        const changed =
          !current ||
          current.status !== data.call.status ||
          current.initiatorId !== data.call.initiatorId ||
          current.receiverId !== data.call.receiverId;

        if (changed) {
          log("poll: status=", data.call.status);
          updateCall(data.call);
        }
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
      {/* Hidden audio sink. Off-screen, not display:none — some browsers
          refuse to play fully-hidden media. */}
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
