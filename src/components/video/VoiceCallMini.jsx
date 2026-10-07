// src/components/video/VoiceCallMini.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Minimized voice-call widget. Docked bottom-right by default. The user can
// drag it anywhere on the screen. Once the call is ACTIVE, only the control
// buttons are shown — the avatar + name header collapses.
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
  FaGripVertical,
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

  // ── Draggable position ────────────────────────────────────────────────
  // Position is tracked as {x, y} in viewport coordinates. Defaults to the
  // bottom-right corner but can be dragged anywhere. Bound to viewport so
  // the widget can't be dropped off-screen.
  const [pos, setPos] = useState(null); // null = use CSS default
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // Handle drag start (from the grip)
  const handleDragStart = (e) => {
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    draggingRef.current = true;
    dragOffsetRef.current = {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
    // Set current position so the widget doesn't jump on first move.
    setPos({ x: rect.left, y: rect.top });
    e.preventDefault?.();
  };

  // Handle drag move + end (global listeners while dragging)
  useEffect(() => {
    if (!draggingRef.current) return;

    const onMove = (e) => {
      if (!draggingRef.current) return;
      const point = e.touches ? e.touches[0] : e;
      const el = widgetRef.current;
      const w = el?.offsetWidth || 120;
      const h = el?.offsetHeight || 60;

      let x = point.clientX - dragOffsetRef.current.x;
      let y = point.clientY - dragOffsetRef.current.y;

      // Clamp to viewport with a small margin.
      const margin = 8;
      x = Math.max(margin, Math.min(window.innerWidth - w - margin, x));
      y = Math.max(margin, Math.min(window.innerHeight - h - margin, y));

      setPos({ x, y });
      e.preventDefault?.();
    };

    const onEnd = () => {
      draggingRef.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pos]);

  // ── Load other user info ──────────────────────────────────────────────
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

  // ── Duration ticker ───────────────────────────────────────────────────
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

  // Inline style for drag position. When `pos` is null, CSS handles it.
  const widgetStyle = pos
    ? {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  // When active, hide the header (avatar + name + timer) and show only
  // the control buttons plus a slim timer badge.
  const showHeader = !isActive;

  return (
    <div
      ref={widgetRef}
      className={`${styles.widget} ${isActive ? styles.widgetCompact : ""}`}
      role="dialog"
      aria-label="Voice call (minimized)"
      style={widgetStyle}
    >
      {/* Drag grip — always visible, small handle on the left */}
      <button
        type="button"
        className={styles.grip}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        aria-label="Drag call widget"
        title="Drag to move"
      >
        <FaGripVertical size={12} />
      </button>

      {showHeader ? (
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
              {isPending && isReceiver ? "Incoming…" : "Calling…"}
            </p>
          </div>
        </div>
      ) : (
        // Compact: just show a live duration chip + mute indicator
        <div className={styles.compactMeta}>
          <span className={styles.compactDot} />
          <span className={styles.compactTime}>{duration}</span>
        </div>
      )}

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
                <FaMicrophoneSlash size={12} />
              ) : (
                <FaMicrophone size={12} />
              )}
            </button>
            <button
              className={styles.endBtn}
              onClick={handleEnd}
              title="End call"
              aria-label="End call"
            >
              <FaPhoneSlash size={12} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={expand}
              title="Expand"
              aria-label="Expand call"
            >
              <FaExpand size={12} />
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
                <FaPhoneSlash size={12} />
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
            <FaPhoneSlash size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
