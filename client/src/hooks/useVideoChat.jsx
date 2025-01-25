import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOffers = useRef([]); // Queue for pending offers
  const pendingIceCandidates = useRef([]); // Queue for pending ICE candidates

  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.3cx.com:3478" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
  };

  const handleOffer = async (offer) => {
    try {
      const pc = peerConnectionRef.current;

      if (!pc) return;

      if (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { answer, room });
      } else {
        pendingOffers.current.push(offer);
      }
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const processPendingIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription) {
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    }
  };

  const setupStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;

      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      stream
        .getTracks()
        .forEach((track) => peerConnectionRef.current.addTrack(track, stream));

      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, room });
        }
      };

      if (room) {
        socket.emit("join-room", { room });
        setInRoom(true);

        socket.on("offer", handleOffer);

        socket.on("answer", async (answer) => {
          try {
            const pc = peerConnectionRef.current;
            if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              await processPendingIceCandidates();
            }
          } catch (error) {
            console.error("Error handling answer:", error);
          }
        });

        socket.on("ice-candidate", async (candidate) => {
          try {
            const pc = peerConnectionRef.current;
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              pendingIceCandidates.current.push(candidate);
            }
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        });

        socket.on("ready", async () => {
          try {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { offer, room });
          } catch (error) {
            console.error("Error creating offer:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(error.message);
    }
  };

  useEffect(() => {
    if (!socket) return;

    setupStream();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("ready");
    };
  }, [room, socket]);

  const endCall = () => {
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    socket.emit("leave-room", { room });
    setInRoom(false);
  };

  const toggleAudio = () => setIsAudioMuted((prev) => !prev);

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff((prev) => !prev);
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted((prev) => !prev);
    }
  };

  return {
    localVideoRef,
    remoteVideoRef,
    isAudioMuted,
    isMicMuted,
    isCameraOff,
    inRoom,
    mediaError,
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  };
};

export default useVideoChat;
