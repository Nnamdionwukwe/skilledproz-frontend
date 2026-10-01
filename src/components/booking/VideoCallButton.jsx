import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../lib/api";
import styles from "./VideoCallButton.module.css";
import {
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneSlash,
  FaCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaExpand,
  FaCompress,
} from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────────
// VideoCallButton
//
// Self-hosted video calling. The backend returns a `callUrl` pointing to our
// own MiroTalk P2P server (call.skilledproz.com). This component:
//
//   1. Renders a "Video Call" button in the booking sidebar
//   2. Polls for incoming calls every 5s
//   3. On receiving one, shows Accept / Decline UI
//   4. On accept, embeds the call inline (with option to expand to new tab)
//   5. On end, notifies the backend and tears down the call
//
// The MiroTalk iframe handles all WebRTC internally. We only manage the
// booking-side state machine (PENDING → ACTIVE → ENDED).
// ─────────────────────────────────────────────────────────────────────────────

const POLL_MS = 5000;

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
}) {
  const [call, setCall] = useState(null);
  const [callUrl, setCallUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const inCallRef = useRef(false);

  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  // ── Initial fetch — get any existing call state for this booking ────────
  useEffect(() => {
    if (!canCall) return;
    api
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        if (r.data.data.call) {
          setCall(r.data.data.call);
          setCallUrl(r.data.data.callUrl);
        }
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  // ── Polling — detect incoming / accepted / ended transitions ────────────
  useEffect(() => {
    if (!canCall) return;

    const id = setInterval(async () => {
      // Don't poll when the user is actively in the call — the backend
      // state is already what we expect, and polling during WebRTC wastes
      // bandwidth. Also don't poll if the call has already ended.
      if (inCallRef.current) return;
      if (call?.status === "ENDED" || call?.status === "DECLINED") return;

      try {
        const r = await api.get(`/video-calls/${bookingId}`);
        const { call: updated, callUrl: url } = r.data.data;
        if (!updated) return;

        // Only trigger a re-render if the status actually changed.
        setCall((prev) => {
          if (!prev) return updated;
          if (prev.status === updated.status) return prev;
          return updated;
        });

        if (url) setCallUrl(url);

        // If the other party accepted, join the call immediately.
        if (updated.status === "ACTIVE") {
          inCallRef.current = true;
          clearInterval(id);
        }
      } catch {
        // silent fail — keep polling
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [canCall, bookingId, call?.status]);

  // ── Actions ─────────────────────────────────────────────────────────────

  async function handleInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/video-calls/${bookingId}/initiate`);
      setCall(res.data.data.call);
      setCallUrl(res.data.data.callUrl);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to start call");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setLoading(true);
    setError("");
    try {
      const res = await api.patch(`/video-calls/${bookingId}/accept`);
      setCall(res.data.data.call);
      if (res.data.data.callUrl) setCallUrl(res.data.data.callUrl);
      inCallRef.current = true;
    } catch {
      setError("Failed to accept call");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    setLoading(true);
    try {
      await api.patch(`/video-calls/${bookingId}/decline`);
      setCall((prev) => ({ ...prev, status: "DECLINED" }));
    } catch {
      setError("Failed to decline call");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    // Best-effort — even if the API call fails, remove the UI so the user
    // isn't stuck looking at a dead iframe.
    try {
      await api.patch(`/video-calls/${bookingId}/end`);
    } catch {
      // silent
    }
    setCall((prev) => ({ ...prev, status: "ENDED" }));
    inCallRef.current = false;
    setExpanded(false);
  }

  // ── Guard ──────────────────────────────────────────────────────────────
  if (!canCall) return null;

  // ── Incoming call (receiver) ────────────────────────────────────────────
  if (call?.status === "PENDING" && call?.receiverId === userId) {
    return (
      <div className={styles.incomingWrap}>
        <div className={styles.incomingPulse} />
        <div className={styles.incomingContent}>
          <span className={styles.callIcon}>
            <FaVideo size={22} />
          </span>
          <div>
            <p className={styles.incomingTitle}>Incoming Video Call</p>
            <p className={styles.incomingHint}>Pre-job consultation</p>
          </div>
        </div>
        <div className={styles.incomingBtns}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? (
              <FaSpinner className={styles.spinner} />
            ) : (
              <>
                <FaCheckCircle style={{ marginRight: 4 }} /> Accept
              </>
            )}
          </button>
          <button
            className={styles.declineBtn}
            onClick={handleDecline}
            disabled={loading}
          >
            <FaTimesCircle style={{ marginRight: 4 }} /> Decline
          </button>
        </div>
        {error && (
          <p className={styles.error}>
            <FaExclamationTriangle style={{ marginRight: 6 }} /> {error}
          </p>
        )}
      </div>
    );
  }

  // ── Waiting (initiator) ─────────────────────────────────────────────────
  if (call?.status === "PENDING" && call?.initiatorId === userId) {
    return (
      <div className={styles.waitingWrap}>
        <FaSpinner className={styles.spinner} />
        <span className={styles.waitingText}>Calling… waiting for answer</span>
        <button className={styles.cancelCallBtn} onClick={handleEnd}>
          <FaTimesCircle style={{ marginRight: 4 }} /> Cancel
        </button>
      </div>
    );
  }

  // ── Active call — embed the MiroTalk room ───────────────────────────────
  if (call?.status === "ACTIVE" && callUrl) {
    return (
      <div
        className={`${styles.callRoom} ${expanded ? styles.callRoomExpanded : ""}`}
      >
        <div className={styles.callRoomHeader}>
          <span className={styles.callLive}>
            <FaCircle size={8} color="#ef4444" /> LIVE
          </span>
          <span className={styles.callTitle}>Video Consultation</span>
          <div className={styles.callRoomActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
            </button>
            <a
              href={callUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconBtn}
              title="Open in new tab"
            >
              <FaExternalLinkAlt size={12} />
            </a>
            <button className={styles.endCallBtn} onClick={handleEnd}>
              <FaPhoneSlash style={{ marginRight: 4 }} /> End
            </button>
          </div>
        </div>

        <div className={styles.callIframeWrap}>
          <iframe
            src={callUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className={styles.callIframe}
            title="Video Call"
          />
        </div>

        <p className={styles.callHint}>
          Room ID: <code className={styles.roomCode}>{call.roomId}</code>
        </p>
      </div>
    );
  }

  // ── Ended / Declined ────────────────────────────────────────────────────
  if (call?.status === "ENDED" || call?.status === "DECLINED") {
    return (
      <div className={styles.endedWrap}>
        <span className={styles.endedIcon}>
          {call.status === "DECLINED" ? (
            <FaTimesCircle size={20} color="#ef4444" />
          ) : (
            <FaPhoneSlash size={20} />
          )}
        </span>
        <span className={styles.endedText}>
          {call.status === "DECLINED" ? "Call declined" : "Call ended"}
        </span>
        <button
          className={styles.callBtn}
          onClick={handleInitiate}
          disabled={loading}
        >
          {loading ? (
            <FaSpinner className={styles.spinner} />
          ) : (
            <>
              <FaVideo style={{ marginRight: 6 }} /> Call Again
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Idle — no call in progress ──────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <button
        className={styles.callBtn}
        onClick={handleInitiate}
        disabled={loading}
      >
        {loading ? (
          <FaSpinner className={styles.spinner} />
        ) : (
          <>
            <FaVideo style={{ marginRight: 6 }} /> Video Call
          </>
        )}
      </button>
      <p className={styles.hint}>Start a video call before or during the job</p>
      {error && (
        <p className={styles.error}>
          <FaExclamationTriangle style={{ marginRight: 6 }} /> {error}
        </p>
      )}
    </div>
  );
}
