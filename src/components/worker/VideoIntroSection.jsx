// VideoIntroSection.jsx
// Drop into WorkerPublicProfile:
//   import VideoIntroSection from "./VideoIntroSection";
//   <VideoIntroSection videoUrl={worker.videoIntroUrl} workerName={user.firstName} />
//
// Data is already on the worker object returned by GET /workers/:userId
// (same endpoint the profile page already calls — no extra fetch needed).

import { useRef, useState, useEffect } from "react";
import s from "./VideoIntroSection.module.css";

export default function VideoIntroSection({ videoUrl, workerName }) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | loading | playing | paused
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef(null);

  // Nothing to render if the worker has no video
  if (!videoUrl) return null;

  // ── Detect mobile ─────────────────────────────────────────────────────────
  function isMobile() {
    return typeof window !== "undefined" && window.innerWidth < 768;
  }

  // ── Fullscreen helpers ────────────────────────────────────────────────────
  function requestFS(el) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }
  function exitFS() {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
  }
  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    );
  }

  // ── Progress timer ────────────────────────────────────────────────────────
  function startTimer() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const v = videoRef.current;
      if (v) setElapsed(v.currentTime);
    }, 250);
  }
  function stopTimer() {
    clearInterval(timerRef.current);
  }

  useEffect(() => () => stopTimer(), []);

  // ── Play ──────────────────────────────────────────────────────────────────
  function handlePlay() {
    const video = videoRef.current;
    if (!video || state === "loading") return;

    setState("loading");

    const go = () => {
      video
        .play()
        .then(() => {
          setState("playing");
          startTimer();
          // Mobile → fullscreen the wrapper card for immersion
          if (isMobile() && wrapRef.current) {
            requestFS(wrapRef.current);
          }
        })
        .catch(() => setState("idle"));
    };

    if (video.readyState >= 2) {
      go();
    } else {
      video.load();
      video.addEventListener("canplay", function h() {
        video.removeEventListener("canplay", h);
        go();
      });
    }
  }

  // ── Pause / resume ────────────────────────────────────────────────────────
  function togglePause() {
    const video = videoRef.current;
    if (!video) return;
    if (state === "playing") {
      video.pause();
      setState("paused");
      stopTimer();
    } else if (state === "paused") {
      video
        .play()
        .then(() => {
          setState("playing");
          startTimer();
        })
        .catch(() => {});
    }
  }

  // ── End / exit fullscreen ─────────────────────────────────────────────────
  function handleEnded() {
    setState("idle");
    stopTimer();
    setElapsed(0);
    if (isFullscreen()) exitFS();
  }

  function handleClose() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setState("idle");
    stopTimer();
    setElapsed(0);
    if (isFullscreen()) exitFS();
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  function handleSeek(e) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
    setElapsed(video.currentTime);
  }

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;
  const fmtTime = (t) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const isActive = state === "playing" || state === "paused";

  return (
    <div className={s.wrap} ref={wrapRef}>
      {/* ── Section header ── */}
      <div className={s.header}>
        <span className={s.headerIcon}>🎬</span>
        <div className={s.headerText}>
          <h3 className={s.title}>Video Introduction</h3>
          <p className={s.sub}>
            {workerName ? `${workerName}'s` : "Worker's"} personal 60-second
            intro
          </p>
        </div>
        {isActive && (
          <button
            className={s.closeBtn}
            onClick={handleClose}
            title="Close video"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Player ── */}
      <div className={`${s.player} ${isActive ? s.playerActive : ""}`}>
        <video
          ref={videoRef}
          src={videoUrl}
          className={s.video}
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          onEnded={handleEnded}
          onPause={() => {
            if (state === "playing") {
              setState("paused");
              stopTimer();
            }
          }}
        />

        {/* Idle / loading overlay — shown when video is not playing */}
        {(state === "idle" || state === "loading") && (
          <div className={s.overlay} onClick={handlePlay}>
            <div
              className={`${s.playBtn} ${state === "loading" ? s.playBtnLoading : ""}`}
            >
              {state === "loading" ? (
                <span className={s.spinner} />
              ) : (
                <span className={s.playIcon}>▶</span>
              )}
            </div>
            <span className={s.overlayLabel}>
              {state === "loading" ? "Loading…" : "Watch Introduction"}
            </span>
          </div>
        )}

        {/* Paused overlay */}
        {state === "paused" && (
          <div className={s.pausedOverlay} onClick={togglePause}>
            <div className={s.pausedIcon}>▶</div>
          </div>
        )}

        {/* Controls — visible while active */}
        {isActive && (
          <div className={s.controls} onClick={(e) => e.stopPropagation()}>
            <button className={s.ctrlBtn} onClick={togglePause}>
              {state === "playing" ? "⏸" : "▶"}
            </button>
            <div className={s.progressTrack} onClick={handleSeek}>
              <div className={s.progressFill} style={{ width: `${pct}%` }} />
              <div className={s.progressThumb} style={{ left: `${pct}%` }} />
            </div>
            <span className={s.timeLabel}>
              {fmtTime(elapsed)} / {fmtTime(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
