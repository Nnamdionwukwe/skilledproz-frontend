// src/components/video/InterviewCallButton.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interview video call — lightweight, no booking required.
//
// Three actions:
//   • Start Interview Call  → opens the room in a new tab
//   • Message link          → opens the messages thread with the worker,
//                             with the room URL pre-filled in the composer
//   • Copy link             → copies the room URL to clipboard
//
// Room id is deterministic from (jobPostId, workerId) so both parties always
// land in the same room. No backend state, no ringing, no booking required.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaVideo, FaCheck, FaLink, FaCommentDots } from "react-icons/fa";
import styles from "./InterviewCallButton.module.css";

const CALL_BASE_URL = "https://call.skilledproz.com";

function buildRoomId(jobPostId, workerId) {
  const safeJob = String(jobPostId || "").replace(/[^a-zA-Z0-9-]/g, "");
  const safeWorker = String(workerId || "").replace(/[^a-zA-Z0-9-]/g, "");
  return `interview-${safeJob}-${safeWorker}`.slice(0, 60);
}

export default function InterviewCallButton({
  jobPostId,
  workerId,
  workerName = "",
  jobTitle = "",
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!jobPostId || !workerId) return null;

  const roomId = buildRoomId(jobPostId, workerId);
  const roomUrl = `${CALL_BASE_URL}/${roomId}`;

  function handleStart() {
    window.open(roomUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopy(e) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  // Opens the messages thread with this worker and pre-fills the composer
  // with a friendly invite and the interview room URL.
  function handleMessage() {
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

    const params = new URLSearchParams({
      with: workerId,
      draft,
    });

    navigate(`/messages?${params.toString()}`);
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.startBtn}
        onClick={handleStart}
        title={
          workerName
            ? `Start interview call with ${workerName}`
            : "Start interview call"
        }
      >
        <FaVideo /> Start Interview
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
    </div>
  );
}
