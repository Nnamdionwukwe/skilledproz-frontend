import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../lib/api";
import styles from "./VideoCallButton.module.css";
import {
  FaVideo,
  FaPhone,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneSlash,
  FaCircle,
  FaSpinner,
  FaExclamationTriangle,
} from "react-icons/fa";

// Poll interval in ms — 5 seconds is enough for real-time feel without hammering
const POLL_MS = 5000;

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
}) {
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [error, setError] = useState("");

  const inCallRef = useRef(false);
  inCallRef.current = inCall;

  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  useEffect(() => {
    if (!canCall) return;
    api
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        if (r.data.data.call) setCall(r.data.data.call);
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  useEffect(() => {
    if (!canCall) return;

    const id = setInterval(async () => {
      if (inCallRef.current) return;

      try {
        const r = await api.get(`/video-calls/${bookingId}`);
        const updated = r.data.data.call;
        if (!updated) return;

        setCall((prev) => {
          if (!prev) return updated;
          if (prev.status === updated.status) return prev;
          return updated;
        });

        if (updated.status === "ACTIVE") {
          inCallRef.current = true;
          setInCall(true);
          clearInterval(id);
        }
      } catch {
        // silent fail – keep polling
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [canCall, bookingId]);

  if (!canCall) return null;

  async function handleInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/video-calls/${bookingId}/initiate`);
      setCall(res.data.data.call);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to start call");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setLoading(true);
    try {
      await api.patch(`/video-calls/${bookingId}/accept`);
      setCall((prev) => ({ ...prev, status: "ACTIVE" }));
      inCallRef.current = true;
      setInCall(true);
    } catch {
      setError("Failed to accept call");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    try {
      await api.patch(`/video-calls/${bookingId}/decline`);
      setCall((prev) => ({ ...prev, status: "DECLINED" }));
    } catch {
      setError("Failed to decline call");
    }
  }

  async function handleEnd() {
    try {
      await api.patch(`/video-calls/${bookingId}/end`);
      setCall((prev) => ({ ...prev, status: "ENDED" }));
      inCallRef.current = false;
      setInCall(false);
    } catch {
      setError("Failed to end call");
    }
  }

  // ── Incoming call (receiver) ──
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
                <FaCheckCircle style={{ marginRight: "4px" }} /> Accept
              </>
            )}
          </button>
          <button className={styles.declineBtn} onClick={handleDecline}>
            <FaTimesCircle style={{ marginRight: "4px" }} /> Decline
          </button>
        </div>
        {error && (
          <p className={styles.error}>
            <FaExclamationTriangle style={{ marginRight: "6px" }} /> {error}
          </p>
        )}
      </div>
    );
  }

  // ── Waiting (initiator) ──
  if (call?.status === "PENDING" && call?.initiatorId === userId) {
    return (
      <div className={styles.waitingWrap}>
        <FaSpinner className={styles.spinner} />
        <span className={styles.waitingText}>
          Calling... waiting for answer
        </span>
        <button className={styles.cancelCallBtn} onClick={handleEnd}>
          <FaTimesCircle style={{ marginRight: "4px" }} /> Cancel
        </button>
      </div>
    );
  }

  // ── Active call ──
  if (inCall || call?.status === "ACTIVE") {
    return (
      <VideoCallRoom roomId={call?.roomId} userId={userId} onEnd={handleEnd} />
    );
  }

  // ── Ended / Declined ──
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
              <FaVideo style={{ marginRight: "6px" }} /> Call Again
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Idle ──
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
            <FaVideo style={{ marginRight: "6px" }} /> Video Call
          </>
        )}
      </button>
      <p className={styles.hint}>Start a video call before or during the job</p>
      {error && (
        <p className={styles.error}>
          <FaExclamationTriangle style={{ marginRight: "6px" }} /> {error}
        </p>
      )}
    </div>
  );
}

function VideoCallRoom({ roomId, userId, onEnd }) {
  return (
    <div className={styles.callRoom}>
      <div className={styles.callRoomHeader}>
        <span className={styles.callLive}>
          <FaCircle size={10} color="#ef4444" /> LIVE
        </span>
        <span className={styles.callTitle}>Video Consultation</span>
        <button className={styles.endCallBtn} onClick={onEnd}>
          <FaPhoneSlash style={{ marginRight: "4px" }} /> End
        </button>
      </div>
      <div className={styles.callIframeWrap}>
        <iframe
          src={`https://meet.jit.si/${roomId}?userInfo.displayName="${encodeURIComponent(userId)}"`}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className={styles.callIframe}
          title="Video Call"
        />
      </div>
      <p className={styles.callHint}>
        Room ID: <code className={styles.roomCode}>{roomId}</code>
      </p>
    </div>
  );
}
