// src/components/video/VoiceCallProvider.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The persistent voice-call widget. Mounted ONCE at the app root.
//
// Responsibilities:
//   • Owns the single MiroTalk <iframe>. It must never unmount during a call
//     or the WebRTC session dies.
//   • Polls /voice-calls/:conversationId every 3s while a call is active.
//   • Renders <VoiceCallFullScreen /> or <VoiceCallMini /> based on mode.
//   • Positions the iframe (full-screen, or docked in the mini widget).
//
// Because this lives at the root, the call survives navigation. The user
// can minimize the call, go to /dashboard, click around, and the audio
// keeps flowing.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { useVoiceCall } from "../../context/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";
import styles from "./VoiceCallProvider.module.css";

const POLL_MS = 3000;

export default function VoiceCallProvider() {
  const { accessToken, user, isHydrated } = useAuthStore();
  const { call, callUrl, mode, updateCall, endCall, setCallUrl } =
    useVoiceCall();

  const iframeRef = useRef(null);
  const inFlightRef = useRef(false);

  // ── Poll the backend while a call is present ──────────────────────────
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (!call?.conversationId) return;

    let cancelled = false;
    const conversationId = call.conversationId;

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
        if (data.callUrl) setCallUrl(data.callUrl);
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
  }, [isHydrated, accessToken, user?.id, call?.conversationId]);

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
