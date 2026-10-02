// src/components/video/VoiceCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Incoming banner for CONVERSATION voice calls.
//
// Mounted at the app root (main.jsx). Polls /voice-calls/incoming every 5s
// and shows a banner when the returned call is callType === "voice".
//
// Scope: voice calls initiated from the Messages tab.
//        Video calls (booking OR conversation) have their own banners.
//
// Accept → hand off to VoiceCallContext.openCall(), which opens the
//          full-screen call UI. No navigation. The call survives any
//          subsequent route changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useVoiceCall } from "../../context/VoiceCallContext";
import styles from "./VoiceCallBanner.module.css";
import {
  FaPhone,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from "react-icons/fa";

const POLL_MS = 5000;

// Never show the banner on auth or the call room itself.
const SUPPRESSED_PREFIXES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/google/callback",
  "/call/",
];

export default function VoiceCallBanner() {
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();
  const { openCall, call: activeCall } = useVoiceCall();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  // ── Poll for incoming voice calls ─────────────────────────────────────
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (suppressed) {
      setIncoming(null);
      return;
    }
    // If a call is already open, don't stack another banner on top.
    if (activeCall) {
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
  }, [isHydrated, accessToken, user, suppressed, activeCall]);

  // ── Accept ────────────────────────────────────────────────────────────
  async function handleAccept() {
    if (!incoming) return;
    setLoading(true);
    try {
      const res = await api.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      const data = res.data.data;
      // Hand off to the global provider — it opens full-screen.
      openCall(data.call, data.callUrl);
      setIncoming(null);
    } catch {
      // keep the banner up so the user can retry
    } finally {
      setLoading(false);
    }
  }

  // ── Decline ───────────────────────────────────────────────────────────
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

  // ── Render guard ──────────────────────────────────────────────────────
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
