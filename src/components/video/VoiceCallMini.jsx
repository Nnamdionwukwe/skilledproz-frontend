// src/components/video/VoiceCallMini.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Minimized voice-call widget. Docked bottom-right. The user can keep
// browsing the platform while the audio keeps flowing.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
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

export default function VoiceCallMini({ rtc }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, expand } = useVoiceCall();
  const [duration, setDuration] = useState("00:00");
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isReceiver = call?.receiverId === user?.id;

  const fetchedForRef = useRef(null);

  // Same fix as VoiceCallFullScreen — use the list endpoint and filter
  // client-side, because /api/conversations/:id doesn't exist on the backend.
  useEffect(() => {
    const convoId = call?.conversationId;
    if (!convoId) return;
    if (fetchedForRef.current === convoId) return;
    fetchedForRef.current = convoId;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/messages/conversations", {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const list = res.data.data?.conversations || [];
        const convo = list.find((c) => c.id === convoId);
        const other = convo?.users?.find((u) => u.userId !== user?.id);
        if (!cancelled) setOtherUser(other?.user || null);
      } catch (err) {
        console.warn("[voice] conversation fetch failed:", err?.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.conversationId, user?.id]);

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
    <div
      className={styles.widget}
      role="dialog"
      aria-label="Voice call (minimized)"
    >
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

      <div className={styles.actions}>
        {isActive ? (
          <>
            <button
              className={`${styles.iconBtn} ${rtc?.isMuted ? styles.iconBtnOn : ""}`}
              onClick={rtc?.toggleMute}
              title={rtc?.isMuted ? "Unmute" : "Mute"}
              aria-label={rtc?.isMuted ? "Unmute" : "Mute"}
            >
              {rtc?.isMuted ? (
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
              title="Expand"
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
            title="Cancel"
            aria-label="Cancel call"
          >
            <FaPhoneSlash size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
