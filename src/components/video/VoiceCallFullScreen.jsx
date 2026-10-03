// src/components/video/VoiceCallFullScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen voice-call UI. Shown when context.mode === "fullscreen".
//
//   PENDING + you are caller   → "Calling…", cancel button
//   PENDING + you are receiver → accept / decline buttons
//   ACTIVE                     → duration, mute, end, speaker
//
// The MiroTalk-free WebRTC session is managed by <VoiceCallProvider>. This
// component is purely UI.
//
// 🔧 DEBUG OVERLAY (temporary): a small state panel at the bottom of the
// screen shows the current WebRTC state. It works on phones where DevTools
// aren't available — just take a photo of both screens during a call.
// Remove the <VoiceCallDebugPanel /> JSX once audio is confirmed working.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./VoiceCallFullScreen.module.css";
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaCompress,
  FaSpinner,
} from "react-icons/fa";

function formatDuration(startedAt) {
  if (!startedAt) return "00:00";
  const elapsed = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000,
  );
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug panel — shows live WebRTC state. Temporary.
// ─────────────────────────────────────────────────────────────────────────────
function VoiceCallDebugPanel({ rtc, call, user }) {
  const isInitiator = call?.initiatorId === user?.id;
  const localTracks = rtc?.localStream?.getAudioTracks?.() || [];
  const remoteTracks = rtc?.remoteStream?.getAudioTracks?.() || [];

  // Sample the audio element state every 500 ms so we can see if it's playing.
  const [audioSnapshot, setAudioSnapshot] = useState(null);
  useEffect(() => {
    const tick = () => {
      const el = document.querySelector("audio");
      if (el) {
        setAudioSnapshot({
          hasSrcObject: !!el.srcObject,
          tracks: el.srcObject?.getAudioTracks?.().length || 0,
          paused: el.paused,
          muted: el.muted,
          volume: el.volume,
          readyState: el.readyState,
        });
      } else {
        setAudioSnapshot(null);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const line = (label, value) =>
    `${label.padEnd(12)} ${value === undefined ? "—" : value}`;

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.85)",
        color: "#7CFC00",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 10,
        lineHeight: 1.4,
        padding: "8px 10px",
        borderRadius: 8,
        whiteSpace: "pre",
        pointerEvents: "none",
        maxHeight: 200,
        overflow: "auto",
      }}
    >
      {[
        line("role", isInitiator ? "caller" : "receiver"),
        line("call.status", call?.status),
        line("rtc.status", rtc?.status),
        line("local tracks", localTracks.length),
        line("remote tracks", remoteTracks.length),
        line("isMuted", rtc?.isMuted),
        line("rtc.error", rtc?.error || "none"),
        "---",
        line("audio el", audioSnapshot ? "found" : "NONE"),
        audioSnapshot ? line("  srcObj", audioSnapshot.hasSrcObject) : null,
        audioSnapshot ? line("  tracks", audioSnapshot.tracks) : null,
        audioSnapshot ? line("  paused", audioSnapshot.paused) : null,
        audioSnapshot ? line("  muted", audioSnapshot.muted) : null,
        audioSnapshot ? line("  volume", audioSnapshot.volume) : null,
        audioSnapshot ? line("  readyState", audioSnapshot.readyState) : null,
      ]
        .filter(Boolean)
        .join("\n")}
    </div>
  );
}

export default function VoiceCallFullScreen({ rtc }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, minimize } = useVoiceCall();
  const [duration, setDuration] = useState("00:00");
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isInitiator = call?.initiatorId === user?.id;
  const isReceiver = call?.receiverId === user?.id;

  // Load the other user's profile for the avatar + name.
  useEffect(() => {
    if (!call?.conversationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/conversations/${call.conversationId}`);
        const convo = res.data.data?.conversation;
        const other = convo?.users?.find((u) => u.userId !== user?.id);
        if (!cancelled) setOtherUser(other?.user || null);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.conversationId, user?.id]);

  // Duration ticker.
  useEffect(() => {
    if (!isActive) {
      setDuration("00:00");
      return;
    }
    setDuration(formatDuration(call.startedAt));
    const id = setInterval(
      () => setDuration(formatDuration(call.startedAt)),
      1000,
    );
    return () => clearInterval(id);
  }, [isActive, call?.startedAt]);

  async function handleAccept() {
    if (!call) return;
    setBusy(true);
    try {
      const res = await api.patch(`/voice-calls/${call.conversationId}/accept`);
      updateCall(res.data.data.call);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!call) return;
    setBusy(true);
    try {
      await api.patch(`/voice-calls/${call.conversationId}/decline`);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
      endCall();
    }
  }

  async function handleEnd() {
    if (!call) return;
    try {
      await api.patch(`/voice-calls/${call.conversationId}/end`);
    } catch {
      /* noop */
    }
    endCall();
  }

  if (!call) return null;

  const otherName =
    `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.trim() ||
    "the other party";
  const initials =
    `${otherUser?.firstName?.[0] || ""}${otherUser?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className={styles.overlay} role="dialog" aria-label="Voice call">
      <div className={styles.topBar}>
        <img src="/skilledproz.PNG" alt="SkilledProz" className={styles.logo} />
        <span className={styles.brand}>SkilledProz Voice Call</span>
        {isActive && (
          <span className={styles.liveTag}>
            <span className={styles.liveDot} />
            LIVE
          </span>
        )}
        <button
          className={styles.minimizeBtn}
          onClick={minimize}
          title="Minimize — keep browsing"
          aria-label="Minimize call"
        >
          <FaCompress size={14} />
        </button>
      </div>

      <div className={styles.center}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {otherUser?.avatar ? (
              <img src={otherUser.avatar} alt="" />
            ) : (
              <span>{initials || "?"}</span>
            )}
          </div>
          {(isPending || isActive) && (
            <span
              className={`${styles.pulse} ${
                isActive ? styles.pulseActive : styles.pulseRinging
              }`}
            />
          )}
        </div>

        <p className={styles.name}>{otherName}</p>
        <p className={styles.status}>
          {isActive
            ? duration
            : isPending && isInitiator
              ? "Calling…"
              : isPending && isReceiver
                ? "Incoming voice call"
                : ""}
        </p>

        {rtc?.error && <p className={styles.error}>{rtc.error}</p>}

        {isActive && (
          <p className={styles.hint}>
            You can minimize this call and keep browsing — the audio stays on.
          </p>
        )}
      </div>

      <div className={styles.controls}>
        {isActive && (
          <>
            <button
              className={`${styles.circleBtn} ${
                rtc?.isMuted ? styles.circleBtnOn : ""
              }`}
              onClick={rtc?.toggleMute}
              title={rtc?.isMuted ? "Unmute" : "Mute"}
              aria-label={rtc?.isMuted ? "Unmute" : "Mute"}
            >
              {rtc?.isMuted ? (
                <FaMicrophoneSlash size={20} />
              ) : (
                <FaMicrophone size={20} />
              )}
            </button>

            <button
              className={styles.endBtn}
              onClick={handleEnd}
              title="End call"
              aria-label="End call"
            >
              <FaPhoneSlash size={22} />
            </button>
          </>
        )}

        {isPending && isReceiver && (
          <>
            <button
              className={styles.declineBtn}
              onClick={handleDecline}
              disabled={busy}
              title="Decline"
              aria-label="Decline"
            >
              {busy ? (
                <FaSpinner className={styles.spinner} />
              ) : (
                <FaPhoneSlash size={22} />
              )}
            </button>
            <button
              className={styles.acceptBtn}
              onClick={handleAccept}
              disabled={busy}
              title="Accept"
              aria-label="Accept"
            >
              {busy ? (
                <FaSpinner className={styles.spinner} />
              ) : (
                <FaPhone size={22} />
              )}
            </button>
          </>
        )}

        {isPending && isInitiator && (
          <button
            className={styles.endBtn}
            onClick={handleEnd}
            title="Cancel"
            aria-label="Cancel call"
          >
            <FaPhoneSlash size={22} />
          </button>
        )}
      </div>

      {/* 🔧 TEMPORARY DEBUG OVERLAY — remove once audio is verified working.
          Shows live WebRTC state on-screen, works on phones without DevTools. */}
      <VoiceCallDebugPanel rtc={rtc} call={call} user={user} />
    </div>
  );
}
