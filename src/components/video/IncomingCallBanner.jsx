// src/components/video/IncomingCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global incoming-call banner.
//
// Mounted once at the app root (main.jsx) as a sibling of <App />.
// Polls GET /video-calls/incoming every 5s on EVERY page.
// When a PENDING call is found where the current user is the receiver,
// shows a floating SkilledProz-styled card with Accept / Decline.
//
// Accept → PATCH /accept → navigate to /call/:bookingId
// Decline → PATCH /decline → banner hides
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

// Paths where the banner should never appear (auth flows, landing page).
const SUPPRESSED_PREFIXES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/google/callback",
  "/call/", // already on a call → don't stack another ring
];

export default function IncomingCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissedId, setDismissedId] = useState(null);

  const inFlightRef = useRef(false);

  // ── Suppress on auth pages, landing page, and the call page itself ─────
  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  // ── Poll for incoming calls ────────────────────────────────────────────
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
        const res = await api.get("/video-calls/incoming");
        const { call } = res.data.data || {};

        if (cancelled) return;

        if (call && call.id !== dismissedId) {
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else if (!call) {
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
  }, [isHydrated, accessToken, user, suppressed, dismissedId]);

  // ── Actions ────────────────────────────────────────────────────────────
  async function handleAccept() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/video-calls/${incoming.bookingId}/accept`);
      setIncoming(null);
      navigate(`/call/${incoming.bookingId}`);
    } catch {
      // keep the banner up so they can retry
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/video-calls/${incoming.bookingId}/decline`);
      setDismissedId(incoming.id);
      setIncoming(null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ── Render guard ───────────────────────────────────────────────────────
  if (!incoming || suppressed) return null;

  // Booking title or fallback label
  const subtitle = incoming.booking?.title
    ? `Regarding: ${incoming.booking.title}`
    : "SkilledProz video consultation";

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
            aria-label="Accept call"
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
            aria-label="Decline call"
          >
            <FaTimesCircle size={16} />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
