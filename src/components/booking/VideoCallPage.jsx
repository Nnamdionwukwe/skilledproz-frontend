// src/pages/booking/VideoCallPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-screen video call page.
//
// Route: /call/:bookingId
//
// Flow:
//   1. Loads the booking + any existing VideoCall state
//   2. If no active call → redirect back to booking detail
//   3. If active → renders the MiroTalk room full-screen
//   4. On "End" → calls the API, then navigates back to booking detail
//
// Mirrors the WhatsApp / Zoom full-screen call experience.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./VideoCallPage.module.css";
import {
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaExclamationTriangle,
  FaSpinner,
  FaExpand,
  FaCompress,
  FaExternalLinkAlt,
  FaCircle,
} from "react-icons/fa";

// MiroTalk exposes a few controls via postMessage, but for MVP we just
// embed the iframe and let MiroTalk's own UI handle mic/camera toggles.
// The buttons below are placeholders for the future custom UI.

export default function VideoCallPage() {
  const { bookingId } = useParams();
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

  // ── Load call state ────────────────────────────────────────────────────
  const loadCall = useCallback(async () => {
    try {
      const res = await api.get(`/video-calls/${bookingId}`);
      const data = res.data.data;

      if (!data?.call) {
        // No call exists → user shouldn't be here
        navigate(`/bookings/${bookingId}`, { replace: true });
        return;
      }

      setCall(data.call);
      setCallUrl(data.callUrl);
      inCallRef.current = data.call.status === "ACTIVE";

      if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
        // Already over → back to booking
        navigate(`/bookings/${bookingId}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load call");
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  // ── Poll for status changes (remote ended the call) ────────────────────
  useEffect(() => {
    if (!inCallRef.current) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/video-calls/${bookingId}`);
        const updated = res.data.data.call;
        if (!updated) return;

        if (updated.status === "ENDED" || updated.status === "DECLINED") {
          setEndedByRemote(true);
          clearInterval(pollRef.current);
          // Small delay so the user sees the "call ended" toast
          setTimeout(() => {
            navigate(`/bookings/${bookingId}`, { replace: true });
          }, 2000);
        }
      } catch {
        // silent fail
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, navigate]);

  // ── Prevent accidental navigation (close tab, browser back) ────────────
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

  // ── End the call ───────────────────────────────────────────────────────
  async function handleEnd() {
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await api.patch(`/video-calls/${bookingId}/end`);
    } catch {
      // silent — still navigate away
    }
    inCallRef.current = false;
    navigate(`/bookings/${bookingId}`, { replace: true });
  }

  // ── Open in new tab (fallback for browsers that block iframes) ─────────
  function handleOpenNewTab() {
    if (callUrl) window.open(callUrl, "_blank", "noopener,noreferrer");
  }

  // ── Render guards ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <FaSpinner className={styles.spinner} size={32} />
          <p className={styles.centerText}>Connecting to call…</p>
        </div>
      </div>
    );
  }

  if (error || !call || !callUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <FaExclamationTriangle size={36} color="#ef4444" />
          <p className={styles.centerText}>{error || "Call unavailable"}</p>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate(`/bookings/${bookingId}`)}
          >
            Back to Booking
          </button>
        </div>
      </div>
    );
  }

  if (endedByRemote) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <FaPhoneSlash size={36} color="#ef4444" />
          <p className={styles.centerText}>The other party ended the call</p>
          <p className={styles.centerSub}>Returning to booking…</p>
        </div>
      </div>
    );
  }

  // ── Main call view ─────────────────────────────────────────────────────
  return (
    <div
      className={`${styles.page} ${fullscreen ? styles.pageFullscreen : ""}`}
    >
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <span className={styles.liveTag}>
            <FaCircle size={8} color="#ef4444" /> LIVE
          </span>
          <span className={styles.topTitle}>Video Consultation</span>
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

      {/* The MiroTalk iframe */}
      <div className={styles.stage}>
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className={styles.iframe}
          title="Video Call"
        />
      </div>

      {/* Bottom control bar (WhatsApp-style) */}
      <div className={styles.controlBar}>
        <div className={styles.controlPlaceholder}>
          <p className={styles.controlHint}>
            Use the in-call controls inside the video window above
          </p>
        </div>

        <button className={styles.endBtn} onClick={handleEnd}>
          <FaPhoneSlash size={18} /> End Call
        </button>

        <div className={styles.controlPlaceholder} />
      </div>
    </div>
  );
}
