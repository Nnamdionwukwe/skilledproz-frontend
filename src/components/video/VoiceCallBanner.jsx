// src/components/video/VoiceCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Incoming banner for CONVERSATION voice calls.
//
// Polls /voice-calls/incoming every 5s. On accept, PATCHes the call to ACTIVE
// and then hands the call to the global VoiceCallContext via openCall() so
// the WebRTC hook starts on the receiver's side.
//
// LOG PREFIX: [VCB] (Voice Call Banner)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

function ts() {
  return new Date().toISOString().slice(11, 23);
}

export default function VoiceCallBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user, isHydrated } = useAuthStore();
  const { openCall, call: activeCall } = useVoiceCall();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (suppressed) {
      setIncoming(null);
      return;
    }
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
          console.log(`[VCB ${ts()}] incoming voice call found`, {
            callId: call.id,
            conversationId: call.conversationId,
          });
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
        }
      } catch {
        /* silent */
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

  async function handleAccept() {
    if (!incoming) return;
    setLoading(true);
    try {
      const res = await api.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      const updatedCall = res.data.data.call;
      console.log(`[VCB ${ts()}] accepted — handing call to context`, {
        callId: updatedCall?.id,
        status: updatedCall?.status,
        initiatorId: updatedCall?.initiatorId,
        receiverId: updatedCall?.receiverId,
      });
      // CRITICAL: put the call into the global context so the
      // VoiceCallProvider's WebRTC hook starts on the receiver's side.
      openCall(updatedCall);
      setIncoming(null);
      navigate(`/messages?convo=${incoming.conversationId}`);
    } catch (err) {
      console.error(`[VCB ${ts()}] accept failed:`, err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!incoming) return;
    setLoading(true);
    try {
      await api.patch(`/voice-calls/${incoming.conversationId}/decline`);
      setIncoming(null);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }

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
