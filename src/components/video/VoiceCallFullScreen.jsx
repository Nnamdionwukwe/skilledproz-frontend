// src/components/video/VoiceCallFullScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen voice call UI. Shown when:
//   • You just clicked 📞 (caller, call is PENDING)
//   • You just accepted an incoming call (receiver)
//   • You clicked "Expand" on the mini widget
//
// The MiroTalk iframe lives behind this overlay (owned by VoiceCallProvider).
// The URL is already built with a pre-filled display name, so the iframe
// lands directly in the room — no manual "Join" click.
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
  FaVolumeUp,
  FaVolumeMute,
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

export default function VoiceCallFullScreen({ iframeRef }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, minimize, setCallUrl } = useVoiceCall();

  const [duration, setDuration] = useState("00:00");
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isInitiator = call?.initiatorId === user?.id;
  const isReceiver = call?.receiverId === user?.id;

  // ── Load the other user's info for display ────────────────────────────
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
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.conversationId, user?.id]);

  // ── Duration ticker ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      setDuration("00:00");
      return;
    }
    setDuration(formatDuration(call.startedAt));
    const id = setInterval(() => {
      setDuration(formatDuration(call.startedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive, call?.startedAt]);

  // ── Actions ───────────────────────────────────────────────────────────
  async function handleAccept() {
    if (!call) return;
    setBusy(true);
    try {
      const res = await api.patch(`/voice-calls/${call.conversationId}/accept`);
      updateCall(res.data.data.call);
      // The provider will rebuild the URL with the display name and swap
      // in a fresh iframe — the user lands directly in the room.
      if (res.data.data.callUrl) setCallUrl(res.data.data.callUrl);
    } catch {
      // silent — banner stays up
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
      // silent
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
      // silent
    }
    endCall();
  }

  function postToIframe(message) {
    const win = iframeRef?.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(message, "*");
    } catch {
      // silent
    }
  }

  function handleToggleMute() {
    setMuted((v) => {
      postToIframe({ type: "micMute", value: !v });
      return !v;
    });
  }

  function handleToggleSpeaker() {
    setSpeakerOff((v) => {
      postToIframe({ type: "speakerOff", value: !v });
      return !v;
    });
  }

  if (!call) return null;

  const otherName =
    `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.trim() ||
    "the other party";
  const initials =
    `${otherUser?.firstName?.[0] || ""}${otherUser?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className={styles.overlay} role="dialog" aria-label="Voice call">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
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
          title="Minimize — continue browsing"
          aria-label="Minimize call"
        >
          <FaCompress size={14} />
        </button>
      </div>

      {/* ── Center: avatar + status ─────────────────────────────────── */}
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

        {isActive && (
          <p className={styles.hint}>
            You can minimize this call and keep browsing — the audio stays on.
          </p>
        )}
      </div>

      {/* ── Bottom: controls ─────────────────────────────────────────── */}
      <div className={styles.controls}>
        {isActive && (
          <>
            <button
              className={`${styles.circleBtn} ${muted ? styles.circleBtnOn : ""}`}
              onClick={handleToggleMute}
              title={muted ? "Unmute" : "Mute"}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
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

            <button
              className={`${styles.circleBtn} ${speakerOff ? styles.circleBtnOn : ""}`}
              onClick={handleToggleSpeaker}
              title={speakerOff ? "Speaker on" : "Speaker off"}
              aria-label={speakerOff ? "Speaker on" : "Speaker off"}
            >
              {speakerOff ? (
                <FaVolumeMute size={20} />
              ) : (
                <FaVolumeUp size={20} />
              )}
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
    </div>
  );
}
