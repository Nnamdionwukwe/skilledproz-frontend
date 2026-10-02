// src/hooks/useVoiceCallWebRTC.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages one WebRTC voice-call session.
//
// Responsibilities:
//   • Request microphone access (one browser prompt per session)
//   • Create and manage RTCPeerConnection
//   • Exchange SDP offers/answers + ICE candidates over Socket.IO
//   • Expose the local stream (for muting) and remote stream (for playback)
//   • Clean up all media + sockets on unmount
//
// Usage:
//   const rtc = useVoiceCallWebRTC({
//     conversationId: "abc-123",
//     isInitiator: true,
//   });
//   // rtc.remoteStream, rtc.localStream, rtc.status,
//   // rtc.isMuted, rtc.toggleMute(), rtc.error
//
// Only one instance per active call. Pass conversationId=null to disable.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { getVoiceSocket } from "../lib/voiceSocket";

// Public STUN servers. Media flows peer-to-peer. For the ~5% of users behind
// symmetric NATs, we'd need a TURN server — add one later if needed.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function useVoiceCallWebRTC({ conversationId, isInitiator }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState("idle");
  // idle | requesting-mic | connecting | connected | disconnected | failed
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const startedRef = useRef(false);

  // ── Cleanup ────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => s.track?.stop());
        pcRef.current.close();
      } catch {
        /* noop */
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setError(null);
    pendingIceRef.current = [];
    startedRef.current = false;
  }, []);

  // ── Main effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    if (startedRef.current) return; // StrictMode double-mount guard
    startedRef.current = true;

    let cancelled = false;

    async function start() {
      try {
        setStatus("requesting-mic");

        // 1. Get the mic. ONE prompt per browser session.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. RTCPeerConnection.
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // 3. Remote stream container.
        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            if (!remote.getTracks().includes(track)) {
              remote.addTrack(track);
            }
          });
        };

        // 4. ICE candidates — relay through the socket.
        pc.onicecandidate = (event) => {
          if (!event.candidate) return;
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        // 5. Connection state.
        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") setStatus("failed");
        };

        // 6. Socket signaling.
        const socket = getVoiceSocket();
        if (!socket) {
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;

        const joinRoom = () => {
          socket.emit("voice:join", { conversationId }, (resp) => {
            if (!resp?.ok) {
              setError(resp?.error || "Failed to join call room");
              setStatus("failed");
            }
          });
        };

        if (socket.connected) joinRoom();
        else socket.once("connect", joinRoom);

        // ── Socket event handlers ─────────────────────────────────────
        const onPeerJoined = async () => {
          if (!isInitiator || !pcRef.current) return;
          if (pcRef.current.signalingState !== "stable") return;
          try {
            setStatus("connecting");
            const offer = await pcRef.current.createOffer({
              offerToReceiveAudio: true,
            });
            await pcRef.current.setLocalDescription(offer);
            socket.emit("voice:offer", { conversationId, sdp: offer });
          } catch (err) {
            console.error("[voice] createOffer failed:", err);
          }
        };

        const onOffer = async ({ sdp }) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pcLocal.createAnswer();
            await pcLocal.setLocalDescription(answer);
            socket.emit("voice:answer", { conversationId, sdp: answer });

            for (const c of pendingIceRef.current) {
              try {
                await pcLocal.addIceCandidate(new RTCIceCandidate(c));
              } catch {
                /* noop */
              }
            }
            pendingIceRef.current = [];
          } catch (err) {
            console.error("[voice] handleOffer failed:", err);
          }
        };

        const onAnswer = async ({ sdp }) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            if (pcLocal.signalingState === "have-local-offer") {
              await pcLocal.setRemoteDescription(
                new RTCSessionDescription(sdp),
              );
              for (const c of pendingIceRef.current) {
                try {
                  await pcLocal.addIceCandidate(new RTCIceCandidate(c));
                } catch {
                  /* noop */
                }
              }
              pendingIceRef.current = [];
            }
          } catch (err) {
            console.error("[voice] handleAnswer failed:", err);
          }
        };

        const onIce = async ({ candidate }) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          if (pcLocal.remoteDescription?.type) {
            try {
              await pcLocal.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
              /* noop */
            }
          } else {
            pendingIceRef.current.push(candidate);
          }
        };

        const onPeerLeft = () => {
          setStatus("disconnected");
        };

        socket.on("voice:peer-joined", onPeerJoined);
        socket.on("voice:offer", onOffer);
        socket.on("voice:answer", onAnswer);
        socket.on("voice:ice", onIce);
        socket.on("voice:peer-left", onPeerLeft);

        // Store handlers so the cleanup can remove them.
        socketRef.current.__voiceHandlers = {
          onPeerJoined,
          onOffer,
          onAnswer,
          onIce,
          onPeerLeft,
        };
      } catch (err) {
        console.error("[voice] setup failed:", err);
        if (err.name === "NotAllowedError") {
          setError("Microphone permission denied. Enable it in your browser.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found on this device.");
        } else {
          setError(err.message || "Failed to start call");
        }
        setStatus("failed");
      }
    }

    start();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        try {
          socket.emit("voice:leave", { conversationId });
          const h = socket.__voiceHandlers;
          if (h) {
            socket.off("voice:peer-joined", h.onPeerJoined);
            socket.off("voice:offer", h.onOffer);
            socket.off("voice:answer", h.onAnswer);
            socket.off("voice:ice", h.onIce);
            socket.off("voice:peer-left", h.onPeerLeft);
          }
        } catch {
          /* noop */
        }
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ── Mute / unmute ─────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    const next = !isMuted;
    tracks.forEach((t) => (t.enabled = !next));
    setIsMuted(next);
  }, [isMuted]);

  return {
    localStream,
    remoteStream,
    status,
    isMuted,
    error,
    toggleMute,
  };
}
