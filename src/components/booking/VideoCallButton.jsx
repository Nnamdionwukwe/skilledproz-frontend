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

  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  useEffect(() => {
    if (!canCall) return;
    api
      .get(`/video-calls/${bookingId}`)
      .then((r) => setCall(r.data.data.call))
      .catch(() => {});
  }, [bookingId, canCall]);

  // Poll for call status changes when call is pending
  useEffect(() => {
    if (call?.status === "PENDING" && call?.initiatorId !== userId) {
      pollRef.current = setInterval(() => {
        api
          .get(`/video-calls/${bookingId}`)
          .then((r) => {
            const updated = r.data.data.call;
            setCall(updated);
            if (updated?.status === "ACTIVE") {
              clearInterval(pollRef.current);
              setInCall(true);
            }
          })
          .catch(() => {});
      }, 3000);
    }
    return () => clearInterval(pollRef.current);
  }, [call?.status, call?.initiatorId, userId, bookingId]);

  if (!canCall) return null;

  async function handleInitiate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/video-calls/${bookingId}/initiate`);
      setCall(res.data.data.call);
      setInCall(true);
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

  // Incoming call (pending, receiver is current user)
  if (call?.status === "PENDING" && call?.receiverId === userId) {
    return (
      <div className={styles.incomingWrap}>
        <div className={styles.incomingPulse} />
        <div className={styles.incomingContent}>
          <span className={styles.callIcon}>📹</span>
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

  // Waiting for the other party
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

  // In active call
  if (inCall && call?.status === "ACTIVE") {
    return (
      <VideoCallRoom roomId={call.roomId} userId={userId} onEnd={handleEnd} />
    );
  }

  // Call ended or declined
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

  // Idle — no call yet
  return (
    <div className={styles.wrap}>
      <button
        className={styles.callBtn}
        onClick={handleInitiate}
        disabled={loading}
      >
        {loading ? <Spinner /> : "📹 Video Call — Pre-job Consultation"}
      </button>
      <p className={styles.hint}>Start a video call before the job begins</p>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

// ── In-call room using daily.co free embed (no API key needed) ────────────────
function VideoCallRoom({ roomId, userId, onEnd }) {
  const iframeRef = useRef(null);

  // We use whereby.com free embed — no API key required for basic calls
  // Replace with Daily.co, Jitsi, or Agora in production
  const callUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${userId}"`;

  return (
    <div className={styles.callRoom}>
      <div className={styles.callRoomHeader}>
        <span className={styles.callLive}>🔴 LIVE</span>
        <span className={styles.callTitle}>Video Consultation</span>
        <button className={styles.endCallBtn} onClick={onEnd}>
          📵 End Call
        </button>
      </div>
      <div className={styles.callIframeWrap}>
        <iframe
          ref={iframeRef}
          src={callUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className={styles.callIframe}
          title="Video Call"
        />
      </div>
      <p className={styles.callHint}>
        Share the room link with the other party if they're having trouble
        connecting. Room: <code className={styles.roomCode}>{roomId}</code>
      </p>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}
