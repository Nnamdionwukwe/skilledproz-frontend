// src/pages/booking/ConversationVideoCallPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen video call page for conversation-scoped calls.
//
// Route: /messages/call/:conversationId
//
// Reuses the same VoiceCall record and MiroTalk room as the voice call panel,
// but with video enabled (no audio=1/video=0 params on the iframe URL).
//
// Flow:
//   1. GET /voice-calls/:conversationId → { call, callUrl }
//   2. Strip audio=1/video=0 from callUrl → back to default MiroTalk room
//   3. Render full-screen iframe with SkilledProz chrome
//   4. On end → PATCH /voice-calls/:conversationId/end → navigate back to /messages
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import styles from "./VideoCallPage.module.css";
import {
  FaPhoneSlash,
  FaExclamationTriangle,
  FaSpinner,
  FaExpand,
  FaCompress,
  FaExternalLinkAlt,
} from "react-icons/fa";

function buildVideoRoomUrl(baseUrl) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    // Strip the audio-only overrides so MiroTalk prompts for camera too
    url.searchParams.delete("audio");
    url.searchParams.delete("video");
    url.searchParams.set("noti", "0");
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export default function ConversationVideoCallPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [call, setCall] = useState(null);
  const [callUrl, setCallUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [endedByRemote, setEndedByRemote] = useState(false);

  const pollRef = useRef(null);
  const inCallRef = useRef(false);

  const loadCall = useCallback(async () => {
    try {
      const res = await api.get(`/voice-calls/${conversationId}`);
      const data = res.data.data;

      if (!data?.call) {
        // No call → redirect back to messages
        navigate(`/messages?convo=${conversationId}`, { replace: true });
        return;
      }

      setCall(data.call);
      setCallUrl(buildVideoRoomUrl(data.callUrl));
      inCallRef.current = data.call.status === "ACTIVE";

      if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
        navigate(`/messages?convo=${conversationId}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load call");
    } finally {
      setLoading(false);
    }
  }, [conversationId, navigate]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  // Poll for remote end
  useEffect(() => {
    if (!inCallRef.current) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/voice-calls/${conversationId}`);
        const updated = res.data.data.call;
        if (!updated) return;

        if (updated.status === "ENDED" || updated.status === "DECLINED") {
          setEndedByRemote(true);
          clearInterval(pollRef.current);
          setTimeout(() => {
            navigate(`/messages?convo=${conversationId}`, { replace: true });
          }, 2000);
        }
      } catch {
        // silent
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, navigate]);

  async function handleEnd() {
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await api.patch(`/voice-calls/${conversationId}/end`);
    } catch {
      // silent
    }
    inCallRef.current = false;
    navigate(`/messages?convo=${conversationId}`, { replace: true });
  }

  function handleOpenNewTab() {
    if (callUrl) window.open(callUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
          <FaSpinner className={styles.spinner} size={28} />
          <p className={styles.centerText}>Connecting your video call…</p>
        </div>
      </div>
    );
  }

  if (error || !call || !callUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <FaExclamationTriangle size={32} color="#ef4444" />
          <p className={styles.centerText}>{error || "Call unavailable"}</p>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate(`/messages?convo=${conversationId}`)}
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  if (endedByRemote) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <FaPhoneSlash size={32} color="#ef4444" />
          <p className={styles.centerText}>The other party ended the call</p>
          <p className={styles.centerSub}>Returning to messages…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${fullscreen ? styles.pageFullscreen : ""}`}
    >
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.logo}
          />
          <div className={styles.topMeta}>
            <span className={styles.topTitle}>SkilledProz Video Call</span>
          </div>
          <span className={styles.liveTag}>
            <span className={styles.liveDot} />
            LIVE
          </span>
        </div>

        <div className={styles.topRight}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleOpenNewTab}
            title="Open in new tab"
          >
            <FaExternalLinkAlt size={12} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className={styles.stage}>
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className={styles.iframe}
          title="SkilledProz Video Call"
        />
      </div>

      {/* Bottom bar */}
      <div className={styles.controlBar}>
        <div className={styles.controlSide}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.controlLogo}
          />
          <span className={styles.controlBrand}>SkilledProz</span>
        </div>

        <button className={styles.endBtn} onClick={handleEnd}>
          <FaPhoneSlash size={18} /> End Call
        </button>

        <div className={styles.controlSide}>
          <p className={styles.controlHint}>Secure peer-to-peer video call</p>
        </div>
      </div>
    </div>
  );
}
