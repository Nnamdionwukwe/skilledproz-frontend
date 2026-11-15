// src/components/video/VideoCallButton.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import styles from "./VideoCallButton.module.css";
import {
  FaVideo,
  FaPhoneSlash,
  FaSpinner,
  FaExclamationTriangle,
  FaTimesCircle,
} from "react-icons/fa";

const POLL_MS = 5000;

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
}) {
  const navigate = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigatedRef = useRef(false);
  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  // ── Initial fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    api
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        if (r.data.data.call) setCall(r.data.data.call);
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  // ── Navigate to the call page when the status becomes ACTIVE ───────────
  useEffect(() => {
    if (call?.status === "ACTIVE" && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate(`/call/${bookingId}`);
    }
  }, [call?.status, bookingId, navigate]);

  // ── Poll for state changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    if (navigatedRef.current) return;
    if (call?.status === "ENDED" || call?.status === "DECLINED") return;

    const id = setInterval(async () => {
      try {
        const r = await api.get(`/video-calls/${bookingId}`);
        const updated = r.data.data.call;
        if (!updated) return;
        setCall((prev) => {
          if (!prev) return updated;
          if (prev.status === updated.status) return prev;
          return updated;
        });
      } catch {
        // silent
      }
    }, POLL_MS);

    return () => clearInterval(id);
  }, [canCall, bookingId, call?.status]);

  // ── Actions ────────────────────────────────────────────────────────────
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

  async function handleCancel() {
    setLoading(true);
    try {
      await api.patch(`/video-calls/${bookingId}/end`);
      setCall((prev) => ({ ...prev, status: "ENDED" }));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!canCall) return null;

  // ── Incoming — handled by global <IncomingCallBanner /> ────────────────
  // We deliberately do NOT render an inline incoming panel here. The global
  // banner handles the ring UI, and after Accept it navigates the receiver
  // to /call/:bookingId where this component re-mounts and sees ACTIVE.
  if (call?.status === "PENDING" && call?.receiverId === userId) {
    return null;
  }

  // ── Waiting for answer (initiator only) ────────────────────────────────
  if (call?.status === "PENDING" && call?.initiatorId === userId) {
    return (
      <div className={styles.waitingWrap}>
        <FaSpinner className={styles.spinner} />
        <span className={styles.waitingText}>Calling… waiting for answer</span>
        <button
          className={styles.cancelCallBtn}
          onClick={handleCancel}
          disabled={loading}
        >
          <FaTimesCircle style={{ marginRight: 4 }} /> Cancel
        </button>
      </div>
    );
  }

  // ── Ended / declined ───────────────────────────────────────────────────
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

  // ── Idle ───────────────────────────────────────────────────────────────
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
