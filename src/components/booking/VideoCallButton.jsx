import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import styles from "./VideoCallButton.module.css";

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
  const pollRef = useRef(null);
  const POLL_MS = 4000;

  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  // Initial load
  useEffect(() => {
    if (!canCall) return;
    api
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        if (r.data.data.call) setCall(r.data.data.call);
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  // ── Always poll when canCall — receiver needs to know about incoming calls ──
  useEffect(() => {
    if (!canCall) return;

    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/video-calls/${bookingId}`);
        const updated = r.data.data.call;
        if (!updated) return;

        setCall((prev) => {
          // If it was idle and now PENDING from someone else — ring!
          if (
            (!prev || prev.status === "ENDED" || prev.status === "DECLINED") &&
            updated.status === "PENDING" &&
            updated.receiverId === userId
          ) {
            return updated;
          }
          if (prev?.status !== updated.status) return updated;
          return prev;
        });

        if (updated.status === "ACTIVE" && !inCall) {
          setInCall(true);
          clearInterval(pollRef.current);
        }
      } catch {}
    }, POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [canCall, bookingId, userId, inCall]);

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
      setInCall(true);
      clearInterval(pollRef.current);
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
      setInCall(false);
    } catch {
      setError("Failed to end call");
    }
  }

  // ── INCOMING call — receiver ──
  if (call?.status === "PENDING" && call?.receiverId === userId) {
    return (
      <div className={styles.incomingWrap}>
        <div className={styles.incomingRing}>
          <span className={styles.callIcon}>📹</span>
        </div>
        <div className={styles.incomingPulse} />
        <div className={styles.incomingContent}>
          <div>
            <p className={styles.incomingTitle}>📹 Incoming Video Call</p>
            <p className={styles.incomingHint}>Pre-job consultation</p>
          </div>
        </div>
        <div className={styles.incomingBtns}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? <Spinner /> : "✅ Accept"}
          </button>
          <button className={styles.declineBtn} onClick={handleDecline}>
            ❌ Decline
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  // ── Waiting (initiator side) ──
  if (call?.status === "PENDING" && call?.initiatorId === userId) {
    return (
      <div className={styles.waitingWrap}>
        <span className={styles.spinner} />
        <span className={styles.waitingText}>
          Calling... waiting for answer
        </span>
        <button className={styles.cancelCallBtn} onClick={handleEnd}>
          Cancel
        </button>
      </div>
    );
  }

  // ── Active call ──
  if ((inCall || call?.status === "ACTIVE") && call) {
    return (
      <VideoCallRoom roomId={call.roomId} userId={userId} onEnd={handleEnd} />
    );
  }

  // ── Ended / Declined ──
  if (call?.status === "ENDED" || call?.status === "DECLINED") {
    return (
      <div className={styles.endedWrap}>
        <span className={styles.endedIcon}>
          {call.status === "DECLINED" ? "❌" : "📵"}
        </span>
        <span className={styles.endedText}>
          {call.status === "DECLINED" ? "Call declined" : "Call ended"}
        </span>
        <button
          className={styles.callBtn}
          onClick={handleInitiate}
          disabled={loading}
        >
          {loading ? <Spinner /> : "📹 Call Again"}
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
        {loading ? <Spinner /> : "📹 Video Call"}
      </button>
      <p className={styles.hint}>Start a video call before or during the job</p>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

// Uses Jitsi — free, no account needed, works cross-device
function VideoCallRoom({ roomId, userId, onEnd }) {
  return (
    <div className={styles.callRoom}>
      <div className={styles.callRoomHeader}>
        <span className={styles.callLive}>🔴 LIVE</span>
        <span className={styles.callTitle}>Video Consultation</span>
        <button className={styles.endCallBtn} onClick={onEnd}>
          📵 End
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
        Share this room ID with the other party if needed:{" "}
        <code className={styles.roomCode}>{roomId}</code>
      </p>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}
