// src/components/video/InterviewCallButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import {
  FaVideo,
  FaSpinner,
  FaExclamationTriangle,
  FaLink,
  FaCommentDots,
  FaCheck,
} from "react-icons/fa";
import styles from "./InterviewCallButton.module.css";

const CALL_BASE_URL = "https://call.skilledproz.com";

export default function InterviewCallButton({
  applicationId,
  jobPostId,
  workerId,
  workerName = "",
  jobTitle = "",
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Start the Call via Backend ──
  async function handleStart() {
    if (!applicationId) {
      setError("Missing application ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Hit the backend to create the VideoCall row and trigger the socket
      await api.post(`/jobs/applications/${applicationId}/call`);

      // 2. Navigate the hirer to the call room page
      navigate(`/interview/${applicationId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start interview.");
    } finally {
      setLoading(false);
    }
  }

  // ── Copy Link (Fallback) ──
  async function handleCopy(e) {
    e.stopPropagation();
    if (!jobPostId || !workerId) return;

    // Construct the same room ID the backend uses as a fallback
    const roomId = `interview-${jobPostId}-${workerId}`;
    const roomUrl = `${CALL_BASE_URL}/${roomId}`;

    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  // ── Message Link (Fallback) ──
  function handleMessage() {
    const roomId = `interview-${jobPostId}-${workerId}`;
    const roomUrl = `${CALL_BASE_URL}/${roomId}`;

    const draft = [
      `Hi ${workerName || "there"},`,
      "",
      jobTitle
        ? `I'd like to do a quick video interview for "${jobTitle}".`
        : "I'd like to do a quick video interview.",
      "",
      `Join here when you're free: ${roomUrl}`,
      "",
      "— sent from SkilledProz",
    ].join("\n");

    const params = new URLSearchParams({ with: workerId, draft });
    navigate(`/messages?${params.toString()}`);
  }

  if (!applicationId) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.startBtn}
        onClick={handleStart}
        disabled={loading}
      >
        {loading ? <FaSpinner className={styles.spinner} /> : <FaVideo />}
        <span>{loading ? "Starting..." : "Start Interview"}</span>
      </button>

      <button
        type="button"
        className={styles.messageBtn}
        onClick={handleMessage}
        title="Send the room link in a message"
      >
        <FaCommentDots /> Message link
      </button>

      <button
        type="button"
        className={styles.copyBtn}
        onClick={handleCopy}
        title="Copy invite link"
      >
        {copied ? (
          <>
            <FaCheck /> Copied
          </>
        ) : (
          <>
            <FaLink /> Copy link
          </>
        )}
      </button>

      {error && (
        <p
          className={styles.error}
          style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}
        >
          <FaExclamationTriangle style={{ marginRight: 6 }} /> {error}
        </p>
      )}
    </div>
  );
}
