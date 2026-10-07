// src/hooks/useVoiceCallWebRTC.js
// ─────────────────────────────────────────────────────────────────────────────
// Manages one WebRTC voice-call session.
//
// LOG PREFIX: [WRTC] (WebRTC hook)
//
// IMPORTANT: This file now expects `getIsInitiator` to be a FUNCTION, not a
// boolean. The function is called synchronously inside socket handlers, so
// it always sees the CURRENT value of (call.initiatorId === user.id).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { getVoiceSocket } from "../lib/voiceSocket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function ts() {
  return new Date().toISOString().slice(11, 23);
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

  // Keep the getter in a ref so handlers always call the latest version.
  const getIsInitiatorRef = useRef(getIsInitiator);
  useEffect(() => {
    getIsInitiatorRef.current = getIsInitiator;
  }, [getIsInitiator]);

  // ── Diagnostic helper ────────────────────────────────────────────────
  const safeInit = useCallback(() => {
    try {
      return getIsInitiatorRef.current?.() ?? null;
    } catch (e) {
      console.error(`[WRTC ${ts()}] getIsInitiator() threw:`, e.message);
      return "ERROR";
    }
  }, []);

  // Log whenever the getter returns a different value.
  const lastInitRef = useRef(null);
  useEffect(() => {
    const interval = setInterval(() => {
      const v = safeInit();
      if (v !== lastInitRef.current) {
        lastInitRef.current = v;
        console.log(`[WRTC ${ts()}] isInitiator changed →`, v);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [safeInit]);

  const cleanup = useCallback(() => {
    console.log(`[WRTC ${ts()}] cleanup()`);
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
    startedRef.current = false;
  }, []);

  useEffect(() => {
    console.log(`[WRTC ${ts()}] useEffect fired`, {
      conversationId,
      started: startedRef.current,
    });

    if (!conversationId) {
      console.log(`[WRTC ${ts()}] no conversationId — bailing`);
      return;
    }
    if (startedRef.current) {
      console.log(`[WRTC ${ts()}] already started — bailing`);
      return;
    }
    startedRef.current = true;

    let cancelled = false;

    async function start() {
      try {
        console.log(`[WRTC ${ts()}] start() — requesting mic`);
        setStatus("requesting-mic");

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        console.log(`[WRTC ${ts()}] getUserMedia resolved`, {
          audioTracks: stream.getAudioTracks().length,
        });

        if (cancelled) {
          console.log(`[WRTC ${ts()}] cancelled after getUserMedia`);
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        console.log(`[WRTC ${ts()}] RTCPeerConnection created`);

        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
            console.log(`[WRTC ${ts()}] added local track`, track.kind);
          } catch (e) {
            console.warn(`[WRTC ${ts()}] addTrack failed:`, e);
          }
        });

        pc.ontrack = (event) => {
          console.log(
            `[WRTC ${ts()}] ontrack:`,
            event.track.kind,
            "streams:",
            event.streams.length,
          );

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

        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            console.log(`[WRTC ${ts()}] ICE gathering complete`);
            return;
          }
          console.log(`[WRTC ${ts()}] emitting voice:ice`);
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        pc.onconnectionstatechange = () => {
          console.log(`[WRTC ${ts()}] connectionState:`, pc.connectionState);
          const s = pc.connectionState;
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") setStatus("failed");
        };

        pc.oniceconnectionstatechange = () => {
          console.log(
            `[WRTC ${ts()}] iceConnectionState:`,
            pc.iceConnectionState,
          );
        };

        pc.onsignalingstatechange = () => {
          console.log(`[WRTC ${ts()}] signalingState:`, pc.signalingState);
        };

        const socket = getVoiceSocket();
        if (!socket) {
          console.error(`[WRTC ${ts()}] getVoiceSocket() returned null`);
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;

        const joinRoom = () => {
          console.log(`[WRTC ${ts()}] emitting voice:join`, { conversationId });
          socket.emit("voice:join", { conversationId }, (resp) => {
            console.log(`[WRTC ${ts()}] voice:join response:`, resp);
            if (!resp?.ok) {
              setError(resp?.error || "Failed to join call room");
              setStatus("failed");
            }
          });
        };

        if (socket.connected) {
          console.log(`[WRTC ${ts()}] socket already connected — joining now`);
          joinRoom();
        } else {
          console.log(
            `[WRTC ${ts()}] socket not connected — waiting for connect`,
          );
          socket.once("connect", () => {
            console.log(`[WRTC ${ts()}] socket connected event — joining now`);
            joinRoom();
          });
        }

        const createAndSendOffer = async () => {
          const pcLocal = pcRef.current;
          if (!pcLocal) {
            console.log(`[WRTC ${ts()}] createAndSendOffer: no PC — bailing`);
            return;
          }
          if (offeringRef.current) {
            console.log(
              `[WRTC ${ts()}] createAndSendOffer: offer already in flight — bailing`,
            );
            return;
          }

          const initiating = safeInit();
          console.log(
            `[WRTC ${ts()}] createAndSendOffer: isInitiator=`,
            initiating,
          );
          if (!initiating) {
            console.log(`[WRTC ${ts()}] not initiator — NOT sending offer`);
            return;
          }

          offeringRef.current = true;
          try {
            if (pcLocal.signalingState === "have-local-offer") {
              console.log(`[WRTC ${ts()}] rolling back stale local offer`);
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                console.warn(`[WRTC ${ts()}] rollback failed:`, e);
              }
            }

            setStatus("connecting");
            const offer = await pcLocal.createOffer({
              offerToReceiveAudio: true,
            });
            console.log(`[WRTC ${ts()}] createOffer succeeded`);
            await pcLocal.setLocalDescription(offer);
            socket.emit("voice:offer", { conversationId, sdp: offer });
            console.log(`[WRTC ${ts()}] ✅ sent offer`);
          } catch (err) {
            console.error(`[WRTC ${ts()}] createOffer failed:`, err);
          } finally {
            setTimeout(() => {
              offeringRef.current = false;
            }, 1500);
          }
        };

        const onPeerJoined = async () => {
          const initiating = safeInit();
          console.log(
            `[WRTC ${ts()}] 🎯 voice:peer-joined — isInitiator=`,
            initiating,
          );

          if (!initiating) {
            console.log(
              `[WRTC ${ts()}] peer-joined but NOT initiator — doing nothing`,
            );
            return;
          }
          if (!pcRef.current) {
            console.log(`[WRTC ${ts()}] peer-joined but no PC — doing nothing`);
            return;
          }

          console.log(`[WRTC ${ts()}] scheduling offer in 250ms`);
          setTimeout(() => {
            createAndSendOffer();
          }, 250);
        };

        const onOffer = async ({ sdp }) => {
          console.log(`[WRTC ${ts()}] 📥 received offer`);
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            if (
              pcLocal.signalingState === "have-local-offer" ||
              pcLocal.signalingState === "have-remote-offer"
            ) {
              console.log(
                `[WRTC ${ts()}] rolling back stale state before offer`,
              );
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                console.warn(`[WRTC ${ts()}] rollback failed:`, e);
              }
            }

            await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pcLocal.createAnswer();
            await pcLocal.setLocalDescription(answer);
            socket.emit("voice:answer", { conversationId, sdp: answer });
            console.log(`[WRTC ${ts()}] ✅ sent answer`);

            for (const c of pendingIceRef.current) {
              try {
                await pcLocal.addIceCandidate(new RTCIceCandidate(c));
              } catch {
                /* noop */
              }
            }
            pendingIceRef.current = [];
          } catch (err) {
            console.error(`[WRTC ${ts()}] handleOffer failed:`, err);
          }
        };

        const onAnswer = async ({ sdp }) => {
          console.log(`[WRTC ${ts()}] 📥 received answer`);
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
              console.log(`[WRTC ${ts()}] ✅ applied answer`);
            } else {
              console.log(
                `[WRTC ${ts()}] ignoring answer — signalingState:`,
                pcLocal.signalingState,
              );
            }
          } catch (err) {
            console.error(`[WRTC ${ts()}] handleAnswer failed:`, err);
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
          console.log(`[WRTC ${ts()}] peer left`);
          setStatus("connecting");
        };

        const onSocketReconnect = () => {
          console.log(`[WRTC ${ts()}] socket reconnect — rejoining room`);
          joinRoom();
        };

        socket.on("voice:peer-joined", onPeerJoined);
        socket.on("voice:offer", onOffer);
        socket.on("voice:answer", onAnswer);
        socket.on("voice:ice", onIce);
        socket.on("voice:peer-left", onPeerLeft);
        socket.on("connect", onSocketReconnect);

        console.log(`[WRTC ${ts()}] all socket handlers registered`);

        socketRef.current.__voiceHandlers = {
          onPeerJoined,
          onOffer,
          onAnswer,
          onIce,
          onPeerLeft,
          onSocketReconnect,
        };
      } catch (err) {
        console.error(`[WRTC ${ts()}] setup failed:`, err);
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
      console.log(`[WRTC ${ts()}] useEffect cleanup running`);
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
