import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore"; // ← new
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
    // Don't poll until hydrated, authed, and not on a suppressed route
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

  // ...the JSX return stays exactly as before...
  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      {/* ...card JSX from the previous message, unchanged... */}
    </div>
  );
}
