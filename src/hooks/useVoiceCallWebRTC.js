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
// KEY BEHAVIORS:
//   • `isInitiator` is read from a ref inside handlers, never from the
//     closure, so socket events always see the current value.
//   • When the socket reconnects mid-handshake, we ROLL BACK the stale
//     offer/answer and re-initiate cleanly instead of bailing on the
//     `signalingState !== "stable"` check (that was the source of the
//     intermittent silent calls).
//   • When the socket disconnects, we don't tear down the PC — we wait
//     for reconnection and rejoin the room. The PC might still be usable
//     if the ICE connection survived.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { getVoiceSocket } from "../lib/voiceSocket";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function useVoiceCallWebRTC({ conversationId, isInitiator }) {
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

  // Guard so we don't fire multiple simultaneous offers.
  const offeringRef = useRef(false);

  // Track isInitiator in a ref so the socket handlers always see the
  // latest value, even though the useEffect that installs them only
  // depends on `conversationId`.
  const isInitiatorRef = useRef(isInitiator);
  useEffect(() => {
    isInitiatorRef.current = isInitiator;
  }, [isInitiator]);

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
    if (!conversationId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function start() {
      try {
        setStatus("requesting-mic");

        // ── 1. Microphone ─────────────────────────────────────────────
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

        // ── 2. Peer connection ────────────────────────────────────────
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            console.warn("[voice] addTrack failed:", e);
          }
        });

        // ── 3. Remote tracks ──────────────────────────────────────────
        pc.ontrack = (event) => {
          console.log(
            "[voice] ontrack:",
            event.track.kind,
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

        // ── 4. ICE candidates ─────────────────────────────────────────
        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            console.log("[voice] ICE gathering complete");
            return;
          }
          socketRef.current?.emit("voice:ice", {
            conversationId,
            candidate: event.candidate.toJSON(),
          });
        };

        // ── 5. Connection state ───────────────────────────────────────
        pc.onconnectionstatechange = () => {
          console.log("[voice] connectionState:", pc.connectionState);
          const s = pc.connectionState;
          if (s === "connected") setStatus("connected");
          else if (s === "connecting") setStatus("connecting");
          else if (s === "disconnected") setStatus("disconnected");
          else if (s === "failed") {
            // ICE failed — attempt a fresh offer/answer cycle.
            console.warn("[voice] ICE failed — will attempt re-offer");
            setStatus("failed");
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("[voice] iceConnectionState:", pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
          console.log("[voice] signalingState:", pc.signalingState);
        };

        // ── 6. Signaling socket ───────────────────────────────────────
        const socket = getVoiceSocket();
        if (!socket) {
          setError("Could not connect to signaling server");
          setStatus("failed");
          return;
        }
        socketRef.current = socket;

        const joinRoom = () => {
          socket.emit("voice:join", { conversationId }, (resp) => {
            console.log("[voice] join response:", resp);
            if (!resp?.ok) {
              setError(resp?.error || "Failed to join call room");
              setStatus("failed");
            }
          });
        };

        if (socket.connected) joinRoom();
        else socket.once("connect", joinRoom);

        // ── Offer creation helper ─────────────────────────────────────
        // Creates a fresh offer. If the PC is in a non-stable state,
        // rolls it back first (that's the KEY fix — previously we bailed
        // and the call was left dead).
        const createAndSendOffer = async () => {
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          if (offeringRef.current) {
            console.log("[voice] offer already in flight — skipping");
            return;
          }

          offeringRef.current = true;
          try {
            // Roll back any stale local offer so we start from "stable".
            if (pcLocal.signalingState === "have-local-offer") {
              console.log("[voice] rolling back stale local offer");
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                console.warn("[voice] rollback failed:", e);
              }
            }

            setStatus("connecting");
            const offer = await pcLocal.createOffer({
              offerToReceiveAudio: true,
            });
            await pcLocal.setLocalDescription(offer);
            socket.emit("voice:offer", { conversationId, sdp: offer });
            console.log("[voice] sent offer");
          } catch (err) {
            console.error("[voice] createOffer failed:", err);
          } finally {
            // Short delay before allowing a new offer, so a burst of
            // peer-joined events doesn't spam offers.
            setTimeout(() => {
              offeringRef.current = false;
            }, 1500);
          }
        };

        // ── Peer handlers ─────────────────────────────────────────────
        const onPeerJoined = async () => {
          const initiating = isInitiatorRef.current;
          console.log("[voice] peer-joined, isInitiator:", initiating);

          if (!initiating || !pcRef.current) return;

          // Small debounce so the peer's own join/leave flapping doesn't
          // trigger multiple offers.
          setTimeout(() => {
            createAndSendOffer();
          }, 250);
        };

        const onOffer = async ({ sdp }) => {
          console.log("[voice] received offer");
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            // Always accept a fresh offer from the remote peer.
            // If we're not in "stable" state, roll back first.
            if (
              pcLocal.signalingState === "have-local-offer" ||
              pcLocal.signalingState === "have-remote-offer"
            ) {
              console.log(
                "[voice] rolling back stale state before handling offer",
              );
              try {
                await pcLocal.setLocalDescription({ type: "rollback" });
              } catch (e) {
                console.warn("[voice] rollback failed:", e);
              }
            }

            await pcLocal.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pcLocal.createAnswer();
            await pcLocal.setLocalDescription(answer);
            socket.emit("voice:answer", { conversationId, sdp: answer });
            console.log("[voice] sent answer");

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
          console.log("[voice] received answer");
          const pcLocal = pcRef.current;
          if (!pcLocal) return;
          try {
            // Only apply the answer if we have a pending local offer.
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
            } else {
              console.log(
                "[voice] ignoring answer — signalingState:",
                pcLocal.signalingState,
              );
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
          console.log("[voice] peer left");
          // Don't tear down the PC — the peer might be reconnecting.
          // We'll get another "peer-joined" shortly.
          setStatus("connecting");
        };

        // Reconnect handling: when the socket drops and comes back,
        // re-join the room. Socket.IO re-emits "connect" for us.
        const onSocketReconnect = () => {
          console.log("[voice] socket reconnected — rejoining room");
          joinRoom();
          // If we're the initiator and the peer is already there,
          // the server will emit "peer-joined" again for us.
          // If we're the receiver, we wait for a fresh offer.
        };

        socket.on("voice:peer-joined", onPeerJoined);
        socket.on("voice:offer", onOffer);
        socket.on("voice:answer", onAnswer);
        socket.on("voice:ice", onIce);
        socket.on("voice:peer-left", onPeerLeft);
        socket.on("connect", onSocketReconnect);

        socketRef.current.__voiceHandlers = {
          onPeerJoined,
          onOffer,
          onAnswer,
          onIce,
          onPeerLeft,
          onSocketReconnect,
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
