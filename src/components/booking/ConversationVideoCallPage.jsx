// src/pages/booking/ConversationVideoCallPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen video call page for CONVERSATION-scoped video calls.
//
// Route: /messages/call/:conversationId
//
// The backend tracks the call in the VoiceCall table with callType === "video"
// but does NOT return a callUrl. We derive the MiroTalk room ID from the
// conversation UUID — it's stable and identical for both participants, so
// they always land in the same MiroTalk room.
//
// Flow:
//   1. GET /voice-calls/:conversationId → { call, callType }
//   2. Build https://call.skilledproz.com/skp-conv-<conversationId>?...
//   3. Render full-screen iframe with SkilledProz chrome
//   4. On end → PATCH /voice-calls/:conversationId/end → back to /messages
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./VideoCallPage.module.css";
import {
  FaPhoneSlash,
  FaExclamationTriangle,
  FaSpinner,
  FaExpand,
  FaCompress,
  FaExternalLinkAlt,
} from "react-icons/fa";

// MiroTalk base — same self-hosted instance used by booking video calls.
const CALL_BASE_URL =
  import.meta.env.VITE_CALL_BASE_URL || "https://call.skilledproz.com";

// ─────────────────────────────────────────────────────────────────────────────
// Build the MiroTalk URL for a conversation video call.
//
// The room ID is derived from the conversationId — both participants compute
// the same URL and therefore land in the same MiroTalk room.
//
// URL params:
//   audio=1  → mic on
//   video=1  → camera on
//   notify=0 → suppress the "share this room" modal
//   chat=0   → hide the chat sidebar
//   screen=0 → hide screen-share prompt
//   name=... → pre-fill participant name (skips MiroTalk's join screen)
// ─────────────────────────────────────────────────────────────────────────────
function buildConversationVideoUrl(conversationId, displayName) {
  if (!conversationId) return null;
  try {
    const roomId = `skp-conv-${conversationId}`;
    const url = new URL(`${CALL_BASE_URL}/${roomId}`);
    url.searchParams.set("audio", "1");
    url.searchParams.set("video", "1");
    url.searchParams.set("notify", "0");
    url.searchParams.set("chat", "0");
    url.searchParams.set("screen", "0");
    if (displayName) url.searchParams.set("name", displayName);
    return url.toString();
  } catch (err) {
    console.error("[video] failed to build room URL:", err);
    return null;
  }
}

export default function ConversationVideoCallPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [call, setCall] = useState(null);
  const [callUrl, setCallUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [endedByRemote, setEndedByRemote] = useState(false);

  const pollRef = useRef(null);
  const inCallRef = useRef(false);

  // ── Display name for MiroTalk's ?name= param ─────────────────────────
  const displayName = useMemo(() => {
    if (!user) return "";
    const first = user.firstName || "";
    const last = user.lastName || "";
    if (first || last) return `${first} ${last}`.trim();
    return user.name || user.email?.split("@")[0] || "";
  }, [user]);

  // ── Load the call row and build the room URL ─────────────────────────
  const loadCall = useCallback(async () => {
    try {
      const res = await api.get(`/voice-calls/${conversationId}`);
      const data = res.data.data;

      if (!data?.call) {
        // No row exists — the caller's initiate never ran, or the row was
        // cleaned up. Send the user back to the conversation.
        console.warn(
          "[video] no call row for conversation",
          conversationId,
          "— redirecting back to messages",
        );
        navigate(`/messages?convo=${conversationId}`, { replace: true });
        return;
      }

      if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
        navigate(`/messages?convo=${conversationId}`, { replace: true });
        return;
      }

      // Row exists and isn't ended → render the room.
      setCall(data.call);
      setCallUrl(buildConversationVideoUrl(conversationId, displayName));
      inCallRef.current = true;
    } catch (err) {
      console.error(
        "[video] load call failed:",
        err?.response?.status,
        err?.response?.data || err?.message,
      );
      setError(err.response?.data?.message || "Failed to load call");
    } finally {
      setLoading(false);
    }
  }, [conversationId, navigate, displayName]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  // ── Poll for remote end ──────────────────────────────────────────────
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
        /* silent */
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, navigate]);

  // ── Prevent accidental navigation while on a call ────────────────────
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (inCallRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ── End the call ─────────────────────────────────────────────────────
  async function handleEnd() {
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await api.patch(`/voice-calls/${conversationId}/end`);
    } catch {
      /* silent — still navigate away */
    }
    inCallRef.current = false;
    navigate(`/messages?convo=${conversationId}`, { replace: true });
  }

  // ── Open in a new tab ────────────────────────────────────────────────
  function handleOpenNewTab() {
    if (callUrl) window.open(callUrl, "_blank", "noopener,noreferrer");
  }

  // ── Render guards ────────────────────────────────────────────────────
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
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
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
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
          <FaPhoneSlash size={32} color="#ef4444" />
          <p className={styles.centerText}>The other party ended the call</p>
          <p className={styles.centerSub}>Returning to messages…</p>
        </div>
      </div>
    );
  }

  // ── Main call view ───────────────────────────────────────────────────
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
            {displayName && (
              <span className={styles.topUser}>Signed in as {displayName}</span>
            )}
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
