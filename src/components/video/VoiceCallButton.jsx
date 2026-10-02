// src/components/video/VoiceCallButton.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Voice call initiation button. Sits next to the attach button in the message
// composer. Click → POST /api/voice-calls/:conversationId/initiate → the
// parent <VoiceCallPanel /> picks up the state change and renders the call UI.
//
// This component is stateless: it just fires the initiate request and lets
// the panel do the rest. It disables itself if a call is already in progress.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { FaPhone } from "react-icons/fa";
import api from "../../lib/api";
import styles from "./VoiceCallButton.module.css";

export default function VoiceCallButton({
  conversationId,
  disabled = false,
  onInitiated,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (!conversationId || loading || disabled) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post(`/voice-calls/${conversationId}/initiate`);
      // Notify parent so it can immediately render the call panel
      // instead of waiting for the next 3-second poll.
      if (onInitiated) onInitiated(res.data.data.call);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start call");
      // Clear error after 3 seconds so the button doesn't stay red
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={`${styles.btn} ${error ? styles.btnError : ""}`}
      onClick={handleClick}
      disabled={disabled || loading}
      title={error || "Start voice call"}
      aria-label="Start voice call"
    >
      {loading ? <span className={styles.spinner} /> : <FaPhone size={14} />}
    </button>
  );
}
