// src/components/video/VoiceCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Incoming banner for CONVERSATION voice calls.
//
// Mounted at the app root (main.jsx) as a sibling of <App />.
// Polls /voice-calls/incoming every 5s and shows a banner only when the
// returned call has callType === "voice".
//
// Scope: voice calls initiated from the Messages tab.
//        Video calls (booking OR conversation) have their own banners.
//
// Accept → navigate to /messages?convo=<conversationId> so the receiver
//          lands in the conversation and the VoiceCallPanel takes over.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./VoiceCallBanner.module.css";
import {
  FaPhone,
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
  "/messages", // VoiceCallPanel handles it inline when you're already there
];

export default function VoiceCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  // ── Poll for incoming voice calls ──────────────────────────────────────
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

        // Only handle voice calls — the video banner polls the same
        // endpoint and filters for callType === "video".
        if (call && call.callType === "voice") {
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
        }
      } catch {
        // silent — keep polling
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
      navigate(`/messages?convo=${incoming.conversationId}`);
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
    : "SkilledProz voice call";

  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      <div className={styles.card}>
        <div className={styles.pulseRing} aria-hidden="true" />

        <div className={styles.iconWrap}>
          <FaPhone size={26} color="#fff" />
        </div>

        <div className={styles.body}>
          <p className={styles.title}>Incoming Voice Call</p>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={loading}
            aria-label="Accept voice call"
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
            aria-label="Decline voice call"
          >
            <FaTimesCircle size={16} />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
