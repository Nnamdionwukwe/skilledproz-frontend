// src/components/video/IncomingCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global incoming-call banner.
//
// Mounted once at the app root (main.jsx) as a sibling of <App />.
// Polls BOTH /video-calls/incoming and /voice-calls/incoming every 5s on
// EVERY page. Whichever returns a PENDING call, we show the banner.
//
// Video calls → accept → navigate to /call/:bookingId (full-screen room)
// Voice calls → accept → navigate to /messages?convo=<conversationId> so the
//                          receiver lands in the conversation, where the
//                          floating VoiceCallPanel takes over.
//
// Re-ring behavior (server truth):
//   - When the user Declines, the server flips the call to DECLINED.
//   - The next poll sees no PENDING call → banner hides automatically.
//   - When the caller initiates again, the server flips the same call back
//     to PENDING. The next poll sees a PENDING call → banner shows again.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./IncomingCallBanner.module.css";
import {
  FaVideo,
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
  "/call/",
];

export default function IncomingCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();

  // incoming = { call, callUrl, callType, ... }
  //   callType: "video" | "voice"
  //   For video: call.bookingId is set (targets the booking-scoped room)
  //   For voice: call.conversationId is set (targets the messages panel)
  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  // ── Poll for incoming calls (video + voice) ─────────────────────────────
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
        // Fire both requests in parallel. Whichever returns a call wins.
        // (There should only ever be one at a time, but polling both
        //  in parallel keeps latency low and the logic simple.)
        const [videoRes, voiceRes] = await Promise.allSettled([
          api.get("/video-calls/incoming"),
          api.get("/voice-calls/incoming"),
        ]);

        if (cancelled) return;

        const videoCall =
          videoRes.status === "fulfilled" ? videoRes.value?.data?.data : null;
        const voiceCall =
          voiceRes.status === "fulfilled" ? voiceRes.value?.data?.data : null;

        // Prefer whichever is present. Both won't be at once in practice,
        // but if they are, video takes priority (booking-anchored).
        if (videoCall?.call) {
          setIncoming((prev) => {
            if (
              prev?.callType === "video" &&
              prev.call?.id === videoCall.call.id
            ) {
              return prev;
            }
            return { ...videoCall, callType: "video" };
          });
        } else if (voiceCall?.call) {
          setIncoming((prev) => {
            if (
              prev?.callType === "voice" &&
              prev.call?.id === voiceCall.call.id
            ) {
              return prev;
            }
            return { ...voiceCall, callType: "voice" };
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
      if (incoming.callType === "voice") {
        // PATCH /voice-calls/:conversationId/accept
        await api.patch(`/voice-calls/${incoming.call.conversationId}/accept`);
        setIncoming(null);
        // Land the receiver in the conversation — the VoiceCallPanel
        // inside Messages picks up the ACTIVE state on its next poll.
        navigate(`/messages?convo=${incoming.call.conversationId}`);
      } else {
        // PATCH /video-calls/:bookingId/accept
        await api.patch(`/video-calls/${incoming.call.bookingId}/accept`);
        setIncoming(null);
        // Full-screen video room
        navigate(`/call/${incoming.call.bookingId}`);
      }
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
      if (incoming.callType === "voice") {
        await api.patch(`/voice-calls/${incoming.call.conversationId}/decline`);
      } else {
        await api.patch(`/video-calls/${incoming.call.bookingId}/decline`);
      }
      setIncoming(null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  // ── Render guard ───────────────────────────────────────────────────────
  if (!incoming || suppressed) return null;

  const isVoice = incoming.callType === "voice";

  // Subtitle text: prefer the booking title for video calls, the caller's
  // name for voice calls.
  const subtitle = isVoice
    ? incoming.callerName
      ? `From ${incoming.callerName}`
      : "Incoming voice call"
    : incoming.call.booking?.title
      ? `Regarding: ${incoming.call.booking.title}`
      : "SkilledProz video consultation";

  const title = isVoice ? "Incoming Voice Call" : "Incoming Video Call";
  const Icon = isVoice ? FaPhone : FaVideo;

  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      <div
        className={`${styles.card} ${
          isVoice ? styles.cardVoice : styles.cardVideo
        }`}
      >
        <div className={styles.pulseRing} aria-hidden="true" />

        <div className={styles.iconWrap}>
          <Icon size={26} color="#fff" />
        </div>

        <div className={styles.body}>
          <p className={styles.title}>{title}</p>
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
