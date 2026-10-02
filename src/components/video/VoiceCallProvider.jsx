// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The persistent voice-call widget. Mounted ONCE at the app root.
//
// Responsibilities:
//   • Owns the single MiroTalk <iframe>. It must never unmount during a call
//     or the WebRTC session dies.
//   • Polls /voice-calls/:conversationId every 3s while a call is active.
//   • Builds the MiroTalk URL with a pre-filled display name so users skip
//     the join/lobby screen and land directly in the room.
//   • Renders <VoiceCallFullScreen /> or <VoiceCallMini /> based on mode.
//   • Positions the iframe (full-screen, or docked in the mini widget).
//
// Because this lives at the root, the call survives navigation. The user
// can minimize the call, go to /dashboard, click around, and the audio
// keeps flowing.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useMemo } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";
import styles from "./VoiceCallProvider.module.css";

const POLL_MS = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// buildVoiceRoomUrl
//
// MiroTalk's join screen appears ONLY when the `name` URL parameter is missing
// or empty. Passing a non-empty name drops the user straight into the room.
//
// MiroTalk's documented join parameters:
//   ?room=<roomId>          — required in some forks even if in the path
//   &name=<displayName>     — pre-fills the participant name, SKIPS the prompt
//   &audio=1|0              — mic on/off
//   &video=1|0              — camera on/off
//   &notify=0               — suppress the "share this room" notification
//   &chat=0|1               — show/hide chat sidebar
//   &screen=0|1             — allow screen share
//   &hide=1                 — hide the top bar (some versions)
//   &left=1                 — hide the bottom-left toolbar (some versions)
//
// If HOST_PROTECTED=true is set on the MiroTalk server, a valid `token` is
// ALSO required — otherwise MiroTalk will still show the lobby. In that case
// the backend must generate the JWT. We don't currently enable this.
// ─────────────────────────────────────────────────────────────────────────────
function buildVoiceRoomUrl(baseUrl, displayName) {
  if (!baseUrl) return baseUrl;
  try {
    const url = new URL(baseUrl);

    // Ensure the room id is set as a query param — some forks require it
    // in addition to the path segment.
    const pathRoom = url.pathname.split("/").filter(Boolean).pop();
    if (pathRoom) url.searchParams.set("room", pathRoom);

    // THE KEY FIX: a non-empty name skips the join screen entirely.
    url.searchParams.set(
      "name",
      (displayName && displayName.trim()) || "SkilledProz User",
    );

    // Audio-only defaults.
    url.searchParams.set("audio", "1");
    url.searchParams.set("video", "0");

    // Correct parameter name is `notify` (not `noti`).
    url.searchParams.set("notify", "0");

    // Strip the extra UI we don't want in a voice call.
    url.searchParams.set("chat", "0");
    url.searchParams.set("screen", "0");

    return url.toString();
  } catch {
    return baseUrl;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function VoiceCallProvider() {
  const { accessToken, user, isHydrated } = useAuthStore();
  const { call, callUrl, mode, updateCall, endCall, setCallUrl } =
    useVoiceCall();

  const iframeRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastConversationRef = useRef(null);

  // Compute the display name once per session.
  const displayName = useMemo(() => {
    const first = user?.firstName || "";
    const last = user?.lastName || "";
    const full = `${first} ${last}`.trim();
    return full || user?.email || "SkilledProz User";
  }, [user?.firstName, user?.lastName, user?.email]);

  // ── Poll the backend while a call is present ──────────────────────────
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (!call?.conversationId) return;

    let cancelled = false;
    const conversationId = call.conversationId;
    lastConversationRef.current = conversationId;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await api.get(`/voice-calls/${conversationId}`);
        const data = res.data.data;
        if (cancelled) return;

        if (!data?.call) {
          endCall();
          return;
        }

        // Remote ended/declined → shut down
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
          endCall();
          return;
        }

        // Sync status changes (PENDING → ACTIVE, etc.)
        updateCall(data.call);

        // Only rebuild the URL if the backend gave us a fresh one. When the
        // call goes ACTIVE, we want the iframe to mount with the display
        // name already baked in.
        if (data.callUrl && data.callUrl !== callUrl) {
          setCallUrl(buildVoiceRoomUrl(data.callUrl, displayName));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, accessToken, user?.id, call?.conversationId, displayName]);

  // ── Normalize the URL when the caller hands off ────────────────────────
  // The caller's startCall() passes the raw backend URL. The receiver's
  // openCall() also passes the raw backend URL. In both cases, rebuild it
  // here with the display name so the iframe never shows the join screen.
  useEffect(() => {
    if (!callUrl) return;
    // Skip if it already has a name param baked in by us.
    if (callUrl.includes("name=")) return;
    setCallUrl(buildVoiceRoomUrl(callUrl, displayName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callUrl, displayName]);

  // ── Nothing to render if there's no call ──────────────────────────────
  if (!call || mode === "hidden") return null;

  const isActive = call.status === "ACTIVE";

  // We render ONE iframe. Its wrapper is positioned by CSS based on mode.
  // When the mode changes we DON'T remount the iframe — we just move it.
  return (
    <div className={styles.root} data-mode={mode}>
      {/* The single, persistent MiroTalk iframe. */}
      {isActive && callUrl && (
        <div className={styles.iframeWrap} data-mode={mode}>
          <iframe
            ref={iframeRef}
            src={callUrl}
            allow="microphone; autoplay; clipboard-write; speaker-selection"
            className={styles.iframe}
            title="Voice call audio"
          />
        </div>
      )}

      {mode === "fullscreen" && <VoiceCallFullScreen iframeRef={iframeRef} />}

      {mode === "mini" && <VoiceCallMini iframeRef={iframeRef} />}
    </div>
  );
}
