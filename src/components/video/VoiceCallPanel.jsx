// src/components/video/VoiceCallPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Floating voice call panel — lives inside the Messages component.
//
// Renders different UI based on the current call state:
//   PENDING + you initiated  → "Calling..." with cancel button
//   PENDING + you are receiver → "Incoming call" with accept/decline
//   ACTIVE                    → In-call UI with mute + end + duration
//   ENDED / DECLINED          → Fades out automatically
//
// The MiroTalk iframe is rendered invisibly when ACTIVE — the audio plays
// through it while the panel shows a minimal, distraction-free UI.
//
// Polling: 3 seconds. Faster than the video call banner (5s) because voice
// calls feel more urgent — you want to know quickly whether someone picked up.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./VoiceCallPanel.module.css";
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVolumeUp,
  FaVolumeMute,
  FaSpinner,
} from "react-icons/fa";

const POLL_MS = 3000;

// ─── Format mm:ss from a start timestamp ──────────────────────────────────
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

export default function VoiceCallPanel({
  conversationId,
  otherUser,
  onCallEnded,
}) {
  const { user } = useAuthStore();

  const [call, setCall] = useState(null);
  const [callUrl, setCallUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState("00:00");
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [endedTimer, setEndedTimer] = useState(null);

  const inFlightRef = useRef(false);
  const iframeRef = useRef(null);
  const conversationRef = useRef(conversationId);

  // Keep conversationId in a ref so polling callbacks don't go stale
  useEffect(() => {
    conversationRef.current = conversationId;
  }, [conversationId]);

  // ── Initial fetch + poll ──────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !user) return;

    let cancelled = false;

    async function fetchStatus() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const res = await api.get(`/voice-calls/${conversationId}`);
        const data = res.data.data;

        if (cancelled) return;

        if (!data?.call) {
          setCall(null);
          setCallUrl(null);
          return;
        }

        // Ended/declined — show for 2s then hide
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
          setCall(data.call);
          setCallUrl(data.callUrl);
          if (endedTimer) clearTimeout(endedTimer);
          const timer = setTimeout(() => {
            setCall(null);
            setCallUrl(null);
            if (onCallEnded) onCallEnded();
          }, 2000);
          setEndedTimer(timer);
          return;
        }

        setCall(data.call);
        setCallUrl(data.callUrl);
      } catch {
        // silent — keep polling
      } finally {
        inFlightRef.current = false;
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (endedTimer) clearTimeout(endedTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  // ── Live duration timer when ACTIVE ───────────────────────────────────
  useEffect(() => {
    if (call?.status !== "ACTIVE") {
      setDuration("00:00");
      return;
    }
    setDuration(formatDuration(call.startedAt));
    const id = setInterval(() => {
      setDuration(formatDuration(call.startedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [call?.status, call?.startedAt]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!call) return;
    setLoading(true);
    try {
      const res = await api.patch(`/voice-calls/${conversationId}/accept`);
      setCall(res.data.data.call);
      setCallUrl(res.data.data.callUrl);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [call, conversationId]);

  const handleDecline = useCallback(async () => {
    if (!call) return;
    setLoading(true);
    try {
      await api.patch(`/voice-calls/${conversationId}/decline`);
      setCall((prev) => (prev ? { ...prev, status: "DECLINED" } : prev));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [call, conversationId]);

  const handleEnd = useCallback(async () => {
    if (!call) return;
    try {
      await api.patch(`/voice-calls/${conversationId}/end`);
    } catch {
      // silent — we still hide the panel
    }
    setCall((prev) => (prev ? { ...prev, status: "ENDED" } : prev));
    setCallUrl(null);
    if (onCallEnded) onCallEnded();
  }, [call, conversationId, onCallEnded]);

  const handleCancel = handleEnd; // same effect for outgoing PENDING

  // Mute and speaker toggle are UI-only for now — they'd need MiroTalk's
  // postMessage API to actually control the media. Leaving the buttons as
  // placeholders for the next iteration.
  const handleToggleMute = () => setMuted((v) => !v);
  const handleToggleSpeaker = () => setSpeakerOff((v) => !v);

  // ── Render guard ──────────────────────────────────────────────────────
  if (!call) return null;

  const isInitiator = call.initiatorId === user?.id;
  const isReceiver = call.receiverId === user?.id;
  const other = otherUser || {};
  const otherName =
    `${other.firstName || ""} ${other.lastName || ""}`.trim() ||
    "the other party";

  const initials =
    `${other.firstName?.[0] || ""}${other.lastName?.[0] || ""}`.toUpperCase();

  const isEnded = call.status === "ENDED" || call.status === "DECLINED";
  const isActive = call.status === "ACTIVE";

  // ── Determine what to render ──────────────────────────────────────────
  return (
    <>
      {/* Hidden MiroTalk iframe — plays audio only when active */}
      {isActive && callUrl && (
        <iframe
          ref={iframeRef}
          src={callUrl}
          allow="microphone; autoplay; clipboard-write"
          className={styles.hiddenIframe}
          title="Voice call audio"
        />
      )}

      <div
        className={`${styles.panel} ${isEnded ? styles.panelEnded : ""}`}
        role="dialog"
        aria-live="polite"
        aria-label="Voice call"
      >
        {/* ── Avatar ───────────────────────────────────────────────── */}
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {other.avatar ? (
              <img src={other.avatar} alt="" />
            ) : (
              <span>{initials || "?"}</span>
            )}
          </div>
          {/* Pulsing ring while connecting */}
          {(call.status === "PENDING" || isActive) && (
            <span
              className={`${styles.pulse} ${
                isActive ? styles.pulseActive : styles.pulseRinging
              }`}
            />
          )}
        </div>

        {/* ── Info ─────────────────────────────────────────────────── */}
        <div className={styles.info}>
          <p className={styles.name}>{otherName}</p>
          <p className={styles.status}>
            {isEnded
              ? call.status === "DECLINED"
                ? "Call declined"
                : "Call ended"
              : isActive
                ? duration
                : isInitiator
                  ? "Calling…"
                  : "Incoming voice call"}
          </p>
        </div>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className={styles.actions}>
          {isEnded ? null : isActive ? (
            <>
              <button
                type="button"
                className={`${styles.iconBtn} ${muted ? styles.iconBtnOn : ""}`}
                onClick={handleToggleMute}
                title={muted ? "Unmute" : "Mute"}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <FaMicrophoneSlash size={14} />
                ) : (
                  <FaMicrophone size={14} />
                )}
              </button>

              <button
                type="button"
                className={`${styles.iconBtn} ${speakerOff ? styles.iconBtnOn : ""}`}
                onClick={handleToggleSpeaker}
                title={speakerOff ? "Turn speaker on" : "Turn speaker off"}
                aria-label={speakerOff ? "Turn speaker on" : "Turn speaker off"}
              >
                {speakerOff ? (
                  <FaVolumeMute size={14} />
                ) : (
                  <FaVolumeUp size={14} />
                )}
              </button>

              <button
                type="button"
                className={styles.endBtn}
                onClick={handleEnd}
                title="End call"
                aria-label="End call"
              >
                <FaPhoneSlash size={16} />
              </button>
            </>
          ) : isReceiver ? (
            <>
              <button
                type="button"
                className={styles.declineBtn}
                onClick={handleDecline}
                disabled={loading}
                title="Decline"
                aria-label="Decline"
              >
                {loading ? (
                  <FaSpinner className={styles.spinner} />
                ) : (
                  <FaPhoneSlash size={16} />
                )}
              </button>
              <button
                type="button"
                className={styles.acceptBtn}
                onClick={handleAccept}
                disabled={loading}
                title="Accept"
                aria-label="Accept"
              >
                {loading ? (
                  <FaSpinner className={styles.spinner} />
                ) : (
                  <FaPhone size={16} />
                )}
              </button>
            </>
          ) : (
            // Initiator still waiting — show cancel
            <button
              type="button"
              className={styles.endBtn}
              onClick={handleCancel}
              title="Cancel call"
              aria-label="Cancel call"
            >
              <FaPhoneSlash size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
