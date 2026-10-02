// src/components/video/ConversationVideoCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Incoming banner for CONVERSATION-scoped video calls.
//
// Mounted at the app root (main.jsx) as a sibling of <App />.
// Polls /voice-calls/incoming every 5s and shows a banner only when the
// returned call has callType === "video".
//
// Scope: video calls initiated from the Messages tab.
//        Booking video calls and voice calls have their own banners.
//
// Accept → navigate to /messages/call/:conversationId (full-screen video).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./IncomingCallBanner.module.css";
import {
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";

const POLL_MS = 5000;

const SUPPRESSED_PREFIXES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/google/callback",
  "/messages/call/", // already on the video call page
];

export default function ConversationVideoCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  // ── Poll for incoming conversation video calls ─────────────────────────
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (suppressed) {
      setIncoming(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      try {
        const res = await api.get("/voice-calls/incoming");
        const data = res.data.data || {};
        const call = data.call;

        if (cancelled) return;

        if (call && call.callType === "video") {
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
        }
      } catch {
        // silent
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isHydrated, accessToken, user, suppressed]);

  // ── Accept ─────────────────────────────────────────────────────────────
  async function handleAccept() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/voice-calls/${incoming.conversationId}/accept`);
      setIncoming(null);
      navigate(`/messages/call/${incoming.conversationId}`);
    } catch {
      // keep the banner up so they can retry
    } finally {
      setLoading(false);
    }
  }

  // ── Decline ────────────────────────────────────────────────────────────
  async function handleDecline() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/voice-calls/${incoming.conversationId}/decline`);
      setIncoming(null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ── Render guard ───────────────────────────────────────────────────────
  if (!incoming || suppressed) return null;

  const callerName = incoming.initiator
    ? `${incoming.initiator.firstName || ""} ${incoming.initiator.lastName || ""}`.trim()
    : "";

  const subtitle = callerName
    ? `${callerName} is calling you`
    : "SkilledProz video call";

  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.pulseRing} aria-hidden="true" />

        <div className={styles.iconWrap}>
          <FaVideo size={26} color="#fff" />
        </div>

        <div className={styles.body}>
          <p className={styles.title}>Incoming Video Call</p>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={loading}
            aria-label="Accept video call"
          >
            {loading ? (
              <FaSpinner className={styles.spinner} size={16} />
            ) : (
              <>
                <FaCheckCircle size={16} />
                <span>Accept</span>
              </>
            )}
          </button>

          <button
            className={styles.declineBtn}
            onClick={handleDecline}
            disabled={loading}
            aria-label="Decline video call"
          >
            <FaTimesCircle size={16} />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
