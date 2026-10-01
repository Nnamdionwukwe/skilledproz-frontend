// src/components/video/InterviewCallButton.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interview video call — lightweight, no booking required.
//
// Flow:
//   1. Hirer clicks "Start Interview Call" on an application card.
//   2. We build a deterministic room ID from (jobPostId, workerId) so both
//      parties always land in the same room if they click the same link.
//   3. Opens call.skilledproz.com/<roomId> in a new tab.
//   4. Hirer can copy the URL and message it to the worker via the existing
//      message thread — or use MiroTalk's own share UI once inside.
//
// This is intentionally separate from the booking-based video call system:
// no VideoCall row, no incoming-call banner, no ringing. It's a link, and
// links are the most flexible way to invite someone to a call.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { FaVideo, FaCheck, FaExternalLinkAlt } from "react-icons/fa";
import styles from "./InterviewCallButton.module.css";

const CALL_BASE_URL = "https://call.skilledproz.com";

function buildRoomId(jobPostId, workerId) {
  // Deterministic — same pair always maps to the same room. Sanitized to
  // a URL-safe slug so MiroTalk accepts it as-is.
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
        <FaVideo /> Start Interview Call
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
            <FaExternalLinkAlt /> Copy link
          </>
        )}
      </button>
    </div>
  );
}
