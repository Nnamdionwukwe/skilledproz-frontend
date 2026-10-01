// src/pages/booking/VideoCallPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SkilledProz in-app video call page.
//
// Route: /call/:bookingId
//
// Flow:
//   1. Loads the booking + any existing VideoCall state
//   2. If no active call → redirect back to booking detail
//   3. If active → renders the call full-screen, SkilledProz-branded
//   4. On "End" → calls the API, then navigates back to booking detail
//
// The underlying WebRTC engine is MiroTalk (self-hosted), but the user only
// ever sees SkilledProz branding. All third-party UI names are hidden.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import styles from "./VideoCallPage.module.css";
import {
  FaPhoneSlash,
  FaExclamationTriangle,
  FaSpinner,
  FaExpand,
  FaCompress,
  FaExternalLinkAlt,
} from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────────
// Build the room URL with the user's display name pre-filled.
//
// MiroTalk accepts a ?name= query param that auto-populates the "Your name"
// input on the join screen, so the user never has to type it.
//
// We also force ?noti=0 to hide the share/notification modal and ?chat=0 to
// keep the first impression clean (they can re-enable from MiroTalk's own
// toolbar if needed).
// ─────────────────────────────────────────────────────────────────────────────
function buildRoomUrl(baseUrl, displayName) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (displayName) url.searchParams.set("name", displayName);
    // Mute the join-screen notification popup by default
    url.searchParams.set("noti", "0");
    return url.toString();
  } catch {
    // If baseUrl isn't a valid absolute URL, just append manually
    const sep = baseUrl.includes("?") ? "&" : "?";
    return displayName
      ? `${baseUrl}${sep}name=${encodeURIComponent(displayName)}`
      : baseUrl;
  }
}

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

  // ── Resolve a display name from the auth store ─────────────────────────
  // Falls back through first+last, name, fullName, username, email prefix.
  const displayName = useMemo(() => {
    if (!user) return "";
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    if (first || last) return `${first} ${last}`.trim();
    return (
      user.name ||
      user.fullName ||
      user.username ||
      (user.email ? user.email.split("@")[0] : "") ||
      ""
    );
  }, [user]);

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

  // ── Prevent accidental navigation ──────────────────────────────────────
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

  // ── Open in new tab ────────────────────────────────────────────────────
  function handleOpenNewTab() {
    if (callUrl) {
      const branded = buildRoomUrl(callUrl, displayName);
      window.open(branded, "_blank", "noopener,noreferrer");
    }
  }

  // ── Render guards ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
          <FaSpinner className={styles.spinner} size={28} />
          <p className={styles.centerText}>Connecting your call…</p>
        </div>
      </div>
    );
  }

  if (error || !call || !callUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
          <FaExclamationTriangle size={32} color="#ef4444" />
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
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.centerLogo}
          />
          <FaPhoneSlash size={32} color="#ef4444" />
          <p className={styles.centerText}>The other party ended the call</p>
          <p className={styles.centerSub}>Returning to booking…</p>
        </div>
      </div>
    );
  }

  // ── Main call view ─────────────────────────────────────────────────────
  const roomUrl = buildRoomUrl(callUrl, displayName);

  return (
    <div
      className={`${styles.page} ${fullscreen ? styles.pageFullscreen : ""}`}
    >
      {/* ── SkilledProz branded top bar ─────────────────────────────────── */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.logo}
          />
          <div className={styles.topMeta}>
            <span className={styles.topTitle}>SkilledProz Call</span>
            {displayName && (
              <span className={styles.topUser}>Signed in as {displayName}</span>
            )}
          </div>
          <span className={styles.liveTag}>
            <span className={styles.liveDot} />
            LIVE
          </span>
        </div>

        <div className={styles.topRight}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <FaCompress size={12} /> : <FaExpand size={12} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleOpenNewTab}
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <FaExternalLinkAlt size={12} />
          </button>
        </div>
      </div>

      {/* ── Stage — the call itself ─────────────────────────────────────── */}
      <div className={styles.stage}>
        <iframe
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className={styles.iframe}
          title="SkilledProz Video Call"
        />
      </div>

      {/* ── SkilledProz branded bottom control bar ──────────────────────── */}
      <div className={styles.controlBar}>
        <div className={styles.controlSide}>
          <img
            src="/skilledproz.PNG"
            alt="SkilledProz"
            className={styles.controlLogo}
          />
          <span className={styles.controlBrand}>SkilledProz</span>
        </div>

        <button className={styles.endBtn} onClick={handleEnd}>
          <FaPhoneSlash size={18} /> End Call
        </button>

        <div className={styles.controlSide}>
          <p className={styles.controlHint}>
            Secure peer-to-peer — your call stays private
          </p>
        </div>
      </div>
    </div>
  );
}
