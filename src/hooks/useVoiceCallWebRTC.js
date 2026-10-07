// src/hooks/useVoiceCallWebRTC.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages one WebRTC voice-call session.
//
// The isInitiator flag is passed as a FUNCTION (getIsInitiator) instead of a
// boolean. Inside socket handlers we call it synchronously so we always see
// the current relationship between call.initiatorId and user.id — never a
// stale value from an earlier render.
//
// Joins happen exactly once per room: we guard with hasJoinedRef so the
// "socket reconnect" handler doesn't fire a second join on the initial
// connect.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { getVoiceSocket } from "../lib/voiceSocket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[WRTC ${ts}]`, ...args);
}
function logErr(...args) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[WRTC ${ts}]`, ...args);
}

export default function useVoiceCallWebRTC({ conversationId, getIsInitiator }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const startedRef = useRef(false);
  const offeringRef = useRef(false);
  const hasJoinedRef = useRef(false);

  // Keep the getter in a ref so it's always the latest version.
  const getIsInitiatorRef = useRef(getIsInitiator);
  useEffect(() => {
    getIsInitiatorRef.current = getIsInitiator;
  }, [getIsInitiator]);

  const cleanup = useCallback(() => {
    log("cleanup()");
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
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setStatus("idle");
    setError(null);
    pendingIceRef.current = [];
    offeringRef.current = false;
    hasJoinedRef.current = false;
    startedRef.current = false;
  }, []);

  useEffect(() => {
    log("useEffect fired", {
      conversationId,
      started: startedRef.current,
    });

    if (!conversationId) {
      log("no conversationId — bailing");
      return;
    }
    if (startedRef.current) {
      log("already started — bailing");
      return;
    }
    startedRef.current = true;

    let cancelled = false;

    async function start() {
      try {
        log("start() — requesting mic");
        setStatus("requesting-mic");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        log("getUserMedia resolved", {
          audioTracks: stream.getAudioTracks().length,
        });

        if (cancelled) {
          log("cancelled after getUserMedia");
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        log("RTCPeerConnection created");

        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
            log("added local track", track.kind);
          } catch (e) {
            logErr("addTrack failed:", e);
          }
        });

        // ── Remote tracks ─────────────────────────────────────────────
        pc.ontrack = (event) => {
          log("ontrack:", event.track.kind, "streams:", event.streams.length);

          const incoming = event.streams[0];
          const current = remoteStreamRef.current;
          const next = new MediaStream();

          const tracks = current
            ? [...current.getTracks(), ...incoming.getTracks()]
            : [...incoming.getTracks()];

          const seen = new Set();
          for (const t of tracks) {
            if (seen.has(t.id)) continue;
            seen.add(t.id);
            next.addTrack(t);
          }

          remoteStreamRef.current = next;
          setRemoteStream(next);
        };

        // ── ICE candidates ────────────────────────────────────────────
        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            log("ICE gathering complete");
            return;
          }
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        // ── Connection state ──────────────────────────────────────────
        pc.onconnectionstatechange = () => {
          log("connectionState:", pc.connectionState);
          const s = pc.connectionState;
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") setStatus("failed");
        };

        pc.oniceconnectionstatechange = () => {
          log("iceConnectionState:", pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
          log("signalingState:", pc.signalingState);
        };

        // ── Socket ────────────────────────────────────────────────────
        const socket = getVoiceSocket();
        if (!socket) {
          logErr("getVoiceSocket() returned null");
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;

        const joinRoom = (reason) => {
          if (hasJoinedRef.current) {
            log(`joinRoom skipped (already joined) [${reason}]`);
            return;
          }
          hasJoinedRef.current = true;
          log(`emitting voice:join [${reason}]`, { conversationId });
          socket.emit("voice:join", { conversationId }, (resp) => {
            log("voice:join response:", resp);
            if (!resp?.ok) {
              hasJoinedRef.current = false; // allow retry
              setError(resp?.error || "Failed to join call room");
              setStatus("failed");
            }
          });
        };

        if (socket.connected) {
          joinRoom("socket already connected");
        } else {
          socket.once("connect", () => {
            log("socket connect event (initial)");
            joinRoom("initial connect");
          });
        }

        // ── Offer creation ────────────────────────────────────────────
        const createAndSendOffer = async (trigger) => {
          const pcLocal = pcRef.current;
          if (!pcLocal) {
            log(`createAndSendOffer [${trigger}]: no PC — bailing`);
            return;
          }
          if (offeringRef.current) {
            log(
              `createAndSendOffer [${trigger}]: offer already in flight — bailing`,
            );
            return;
          }

          const initiating = getIsInitiatorRef.current?.();
          log(`createAndSendOffer [${trigger}] isInitiator=${initiating}`);
          if (!initiating) {
            log("not initiator — NOT sending offer");
            return;
          }

          offeringRef.current = true;
          try {
            if (pcLocal.signalingState === "have-local-offer") {
              log("rolling back stale local offer");
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                logErr("rollback failed:", e);
              }
            }

            setStatus("connecting");
            const offer = await pcLocal.createOffer({
              offerToReceiveAudio: true,
            });
            log("createOffer succeeded");
            await pcLocal.setLocalDescription(offer);
            socket.emit("voice:offer", { conversationId, sdp: offer });
            log("✅ sent offer");
          } catch (err) {
            logErr("createOffer failed:", err);
          } finally {
            setTimeout(() => {
              offeringRef.current = false;
            }, 1500);
          }
        };

        // ── Peer handlers ─────────────────────────────────────────────
        const onPeerJoined = async () => {
          const initiating = getIsInitiatorRef.current?.();
          log(`🎯 voice:peer-joined — isInitiator=${initiating}`);

          if (!initiating || !pcRef.current) {
            log("peer-joined: not initiator or no PC — doing nothing");
            return;
          }
          setTimeout(() => {
            createAndSendOffer("peer-joined");
          }, 250);
        };

        const onOffer = async ({ sdp }) => {
          log("📥 received offer");
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            if (
              pcLocal.signalingState === "have-local-offer" ||
              pcLocal.signalingState === "have-remote-offer"
            ) {
              log("rolling back before offer");
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                logErr("rollback failed:", e);
              }
            }

            await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pcLocal.createAnswer();
            await pcLocal.setLocalDescription(answer);
            socket.emit("voice:answer", { conversationId, sdp: answer });
            log("✅ sent answer");

            for (const c of pendingIceRef.current) {
              try {
                await pcLocal.addIceCandidate(new RTCIceCandidate(c));
              } catch {
                /* noop */
              }
            }
            pendingIceRef.current = [];
          } catch (err) {
            logErr("handleOffer failed:", err);
          }
        };

        const onAnswer = async ({ sdp }) => {
          log("📥 received answer");
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
              log("✅ applied answer");
            } else {
              log("ignoring answer — signalingState:", pcLocal.signalingState);
            }
          } catch (err) {
            logErr("handleAnswer failed:", err);
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
          log("peer left");
          setStatus("connecting");
        };

        const onSocketReconnect = () => {
          // Only fires when Socket.IO reconnects AFTER a disconnect.
          // hasJoinedRef gates the join from being re-fired.
          log("socket reconnect");
          hasJoinedRef.current = false; // allow rejoin after a real drop
          joinRoom("socket reconnect");
        };

        socket.on("voice:peer-joined", onPeerJoined);
        socket.on("voice:offer", onOffer);
        socket.on("voice:answer", onAnswer);
        socket.on("voice:ice", onIce);
        socket.on("voice:peer-left", onPeerLeft);
        socket.on("connect", onSocketReconnect);

        log("all socket handlers registered");

        socketRef.current.__voiceHandlers = {
          onPeerJoined,
          onOffer,
          onAnswer,
          onIce,
          onPeerLeft,
          onSocketReconnect,
        };
      } catch (err) {
        logErr("setup failed:", err);
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
      log("useEffect cleanup running");
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
            socket.off("connect", h.onSocketReconnect);
          }
          delete socket.__voiceHandlers;
        } catch {
          /* noop */
        }
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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
