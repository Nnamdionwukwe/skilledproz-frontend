import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import styles from "./VideoCallButton.module.css";
import {
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneSlash,
  FaSpinner,
  FaExclamationTriangle,
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
    // Don't poll if we've already navigated away — avoids a race
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
      // If the backend started us off ACTIVE (rare), navigate immediately.
      // Normally we wait for the receiver to accept.
    } catch (e) {
      setError(e.response?.data?.message || "Failed to start call");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await api.patch(`/video-calls/${bookingId}/accept`);
      setCall(res.data.data.call);
      // The useEffect above detects ACTIVE and navigates to /call/:bookingId
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

  // ── Incoming call ──────────────────────────────────────────────────────
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

  // ── Waiting for answer ─────────────────────────────────────────────────
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
