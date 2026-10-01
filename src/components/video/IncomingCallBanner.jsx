// src/components/video/IncomingCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global incoming-call banner.
//
// Mounted once at the app root (main.jsx) as a sibling of <App />.
// Polls GET /video-calls/incoming every 5s on EVERY page.
//
// Re-ring behavior:
//   - When the user Declines, the server flips the call to DECLINED.
//   - The next poll sees no PENDING call → banner hides automatically.
//   - When the caller initiates again, the server flips the same call back
//     to PENDING. The next poll sees a PENDING call → banner shows again.
//   → We don't need a "dismissed" flag. Server state is the single truth.
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
  "/call/",
];

export default function IncomingCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);

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

        // The backend only returns a call when the current user is the
        // receiver AND the call is PENDING. If it returns null, hide.
        // If it returns a call, show it — regardless of whether we've
        // seen this same call.id before.
        if (call) {
          // Re-render only if the incoming payload actually changed.
          setIncoming((prev) => {
            if (!prev) return call;
            if (prev.id === call.id && prev.status === call.status) {
              return prev;
            }
            return call;
          });
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
      await api.patch(`/video-calls/${incoming.bookingId}/accept`);
      setIncoming(null);
      navigate(`/call/${incoming.bookingId}`);
    } catch {
      // Keep the banner up so they can retry.
    } finally {
      setLoading(false);
    }
  }

  // ── Decline ────────────────────────────────────────────────────────────
  async function handleDecline() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/video-calls/${incoming.bookingId}/decline`);
      // Hide immediately for responsiveness — the next poll will confirm
      // the server-side DECLINED status and keep it hidden until the
      // caller initiates again.
      setIncoming(null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ── Render guard ───────────────────────────────────────────────────────
  if (!incoming || suppressed) return null;

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
