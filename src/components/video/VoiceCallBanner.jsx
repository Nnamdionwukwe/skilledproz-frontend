// src/components/video/VoiceCallBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Incoming banner for CONVERSATION voice calls.
//
// The banner's ONLY job on Accept is:
//   1. PATCH /voice-calls/:conversationId/accept
//   2. Hand the resulting call object to the global VoiceCallContext
//      via openCall()
//   3. Navigate to /messages?convo=:conversationId
//
// Step 2 is CRITICAL. Without it, the receiver's WebRTC hook never starts,
// the receiver's socket never joins the room, the server never emits
// voice:peer-joined to the caller, and no offer is ever created — the call
// stays silent on both ends.
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

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCB ${ts}]`, ...args);
}
function logErr(...args) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[VCB ${ts}]`, ...args);
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

  // ── Poll for incoming voice calls ─────────────────────────────────────
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (suppressed) {
      setIncoming(null);
      return;
    }
    // If we're already on a call, don't stack a second banner on top.
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
          log("incoming voice call", {
            callId: call.id,
            conversationId: call.conversationId,
            initiatorId: call.initiatorId,
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

  // ── Accept ────────────────────────────────────────────────────────────
  async function handleAccept() {
    if (!incoming) return;
    log("ACCEPT tapped", { conversationId: incoming.conversationId });
    setLoading(true);

    try {
      // 1. Flip the call to ACTIVE on the server.
      const res = await api.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      log("accept response", res.data);

      const updatedCall = res.data?.data?.call;
      if (!updatedCall) {
        // Fallback: construct a minimal call object from what we already
        // know so the WebRTC hook still has something to work with.
        logErr("accept response missing call object — using fallback");
        openCall({
          ...incoming,
          status: "ACTIVE",
        });
      } else {
        // 2. Hand off to global context so the WebRTC hook starts.
        openCall(updatedCall);
      }

      log("openCall() dispatched — clearing banner");
      setIncoming(null);

      // 3. Land the receiver in the conversation so they can see the
      //    minimised call widget.
      navigate(`/messages?convo=${incoming.conversationId}`);
    } catch (err) {
      logErr("accept failed:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Decline ───────────────────────────────────────────────────────────
  async function handleDecline() {
    if (!incoming) return;
    log("DECLINE tapped", { conversationId: incoming.conversationId });
    setLoading(true);
    try {
      await api.patch(`/voice-calls/${incoming.conversationId}/decline`);
      setIncoming(null);
    } catch (err) {
      logErr("decline failed:", err?.response?.data || err.message);
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
