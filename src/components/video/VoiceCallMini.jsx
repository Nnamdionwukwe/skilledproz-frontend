// src/components/video/VoiceCallMini.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Minimized voice call widget — docks bottom-right. The user can keep
// browsing the app while the audio keeps flowing (the MiroTalk iframe is
// repositioned behind this widget by VoiceCallProvider).
//
// The URL is owned by VoiceCallProvider and already includes a display-name
// param, so MiroTalk never shows the join screen.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import styles from "./VoiceCallMini.module.css";
import {
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaExpand,
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

export default function VoiceCallMini({ iframeRef }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, expand, setCallUrl } = useVoiceCall();

  const [duration, setDuration] = useState("00:00");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isReceiver = call?.receiverId === user?.id;

  // ── Other user info ───────────────────────────────────────────────────
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

  async function handleAccept() {
    if (!call) return;
    setBusy(true);
    try {
      const res = await api.patch(`/voice-calls/${call.conversationId}/accept`);
      updateCall(res.data.data.call);
      if (res.data.data.callUrl) setCallUrl(res.data.data.callUrl);
    } catch {
      // silent
    } finally {
      setBusy(false);
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

  function postToIframe(msg) {
    const win = iframeRef?.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(msg, "*");
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

  if (!call) return null;

  const otherName =
    `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.trim() ||
    "the other party";
  const initials =
    `${otherUser?.firstName?.[0] || ""}${otherUser?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div
      className={styles.widget}
      role="dialog"
      aria-label="Voice call (minimized)"
    >
      {/* ── Header: avatar + name + status ─────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {otherUser?.avatar ? (
            <img src={otherUser.avatar} alt="" />
          ) : (
            <span>{initials || "?"}</span>
          )}
        </div>
        <div className={styles.meta}>
          <p className={styles.name}>{otherName}</p>
          <p className={styles.status}>
            {isActive
              ? duration
              : isPending && isReceiver
                ? "Incoming…"
                : "Calling…"}
          </p>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className={styles.actions}>
        {isActive ? (
          <>
            <button
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
              className={styles.endBtn}
              onClick={handleEnd}
              title="End call"
              aria-label="End call"
            >
              <FaPhoneSlash size={14} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={expand}
              title="Expand to full screen"
              aria-label="Expand call"
            >
              <FaExpand size={14} />
            </button>
          </>
        ) : isReceiver ? (
          <>
            <button
              className={styles.endBtn}
              onClick={handleEnd}
              disabled={busy}
              title="Decline"
              aria-label="Decline"
            >
              {busy ? (
                <FaSpinner className={styles.spinner} />
              ) : (
                <FaPhoneSlash size={14} />
              )}
            </button>
            <button
              className={styles.acceptBtn}
              onClick={handleAccept}
              disabled={busy}
              title="Accept"
              aria-label="Accept"
            >
              {busy ? <FaSpinner className={styles.spinner} /> : "Accept"}
            </button>
          </>
        ) : (
          <button
            className={styles.endBtn}
            onClick={handleEnd}
            title="Cancel call"
            aria-label="Cancel call"
          >
            <FaPhoneSlash size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
