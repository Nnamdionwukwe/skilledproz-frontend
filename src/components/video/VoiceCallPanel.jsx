// src/components/video/VoiceCallPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Floating voice call panel — lives inside the Messages component.
//
// States:
//   PENDING + you initiated     → "Calling…" with cancel button
//   PENDING + you are receiver  → "Incoming call" with accept/decline
//   ACTIVE                      → In-call UI with mute + end + duration
//   ENDED / DECLINED            → Fades out automatically
//
// AUDIO FIX (this version):
//   The MiroTalk iframe is rendered VISIBLE (small, docked bottom-right) when
//   the call is ACTIVE. This is required because:
//     1. Browsers require a user gesture to grant microphone permission.
//     2. MiroTalk's own "Join" / mic-allow UI lives inside the iframe — if
//        the iframe is hidden, the user can never click it.
//     3. The first time a user accepts a voice call, the browser will show
//        a mic-permission prompt when MiroTalk's iframe requests audio.
//        After that one grant, all subsequent calls just work.
//
//   The iframe is styled small (300×180) and semi-transparent, but it is
//   interactive — the user can click into it if MiroTalk needs any
//   confirmation. Your branded panel sits above it.
//
// Polling: 3 seconds.
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

/**
 * Ensure the MiroTalk URL is in "voice-only, auto-join" mode.
 * Adds the params MiroTalk needs to skip its lobby and go straight to the
 * audio room, and to suppress its own notification modal.
 */
function buildVoiceRoomUrl(baseUrl) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("audio", "1");
    url.searchParams.set("video", "0");
    url.searchParams.set("noti", "0");
    url.searchParams.set("autojoin", "1"); // MiroTalk: skip the join screen
    url.searchParams.set("mic", "1"); // start with mic on
    url.searchParams.set("screen", "0"); // no screen share
    url.searchParams.set("chat", "0"); // hide chat sidebar
    return url.toString();
  } catch {
    return baseUrl;
  }
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
  const [showFrame, setShowFrame] = useState(false);

  const inFlightRef = useRef(false);
  const iframeRef = useRef(null);
  const conversationRef = useRef(conversationId);

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

        // Skip video calls — those are handled by ConversationVideoCallPage.
        if (data.call.callType === "video") {
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
        setCallUrl(buildVoiceRoomUrl(data.callUrl));

        // When the call goes ACTIVE, reveal the MiroTalk iframe.
        if (data.call.status === "ACTIVE") {
          setShowFrame(true);
        }
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
      setCallUrl(buildVoiceRoomUrl(res.data.data.callUrl));
      setShowFrame(true); // reveal the iframe so the browser can prompt for mic
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
      setShowFrame(false);
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
    setShowFrame(false);
    if (onCallEnded) onCallEnded();
  }, [call, conversationId, onCallEnded]);

  const handleCancel = handleEnd;

  // ── Media controls: talk directly to the MiroTalk iframe ──────────────
  // MiroTalk listens for postMessage commands. We use its documented API:
  //   { type: "micMute" }      → toggle mic
  //   { type: "speakerOff" }   → toggle speaker
  // Fallback: if the iframe doesn't respond, the button still toggles the
  // local UI state so the user sees feedback.
  const postToIframe = useCallback((message) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(message, "*");
    } catch {
      // cross-origin fallback — silent
    }
  }, []);

  const handleToggleMute = () => {
    setMuted((v) => {
      const next = !v;
      postToIframe({ type: "micMute", value: next });
      return next;
    });
  };

  const handleToggleSpeaker = () => {
    setSpeakerOff((v) => {
      const next = !v;
      postToIframe({ type: "speakerOff", value: next });
      return next;
    });
  };

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
      {/* MiroTalk iframe — visible when ACTIVE so the user can grant mic.
          Styled small and docked bottom-right; the branded panel floats
          above it. Kept interactive so MiroTalk's own prompts work. */}
      {isActive && callUrl && showFrame && (
        <div className={styles.frameWrap}>
          <iframe
            ref={iframeRef}
            src={callUrl}
            allow="microphone; autoplay; clipboard-write; speaker-selection"
            className={styles.frame}
            title="Voice call audio"
          />
        </div>
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
