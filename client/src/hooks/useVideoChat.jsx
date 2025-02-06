import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
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
    ],
  };

  // Helper function to wait for a specified time
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Reset the peer connection in case of errors or cleanup
  const resetPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current));
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, room });
      }
    };
  };
  // Handle incoming offer
  const handleOffer = async (offer) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Retry mechanism for setting remote description
      const setRemoteDescriptionWithRetry = async (
        maxRetries = 5,
        delay = 1000
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          if (
            pc.signalingState === "stable" ||
            pc.signalingState === "have-remote-offer"
          ) {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            return true;
          }
          await wait(delay);
        }
        throw new Error(
          "Failed to set remote description: Max retries reached"
        );
      };

      const success = await setRemoteDescriptionWithRetry();
      if (!success) return;

      // Create and set the local answer
      const answer = await pc.createAnswer();
      await wait(1000); // 1-second delay before setting local description
      await pc.setLocalDescription(answer);

      // Emit the answer to the signaling server
      socket.emit("answer", { answer, room });
    } catch (error) {
      console.error("Error handling offer:", error);
      resetPeerConnection(); // Reset the peer connection on error
    }
  };

  // Process pending ICE candidates
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

  // Setup media stream and peer connection
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

      await wait(1000); // 1-second delay to ensure media devices are ready
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      // Initialize the peer connection
      resetPeerConnection();

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local tracks to the peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle incoming tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = event.streams[0];
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, room });
        }
      };

      // Join the room and listen for signaling events
      socket.emit("join-room", { room });
      setInRoom(true);

      socket.on("offer", handleOffer);
      socket.on("answer", async (answer) => {
        try {
          if (pc.signalingState === "have-local-offer") {
            await wait(1000); // 1-second delay before setting remote description
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await processPendingIceCandidates();
          }
        } catch (error) {
          console.error("Error handling answer:", error);
          resetPeerConnection(); // Reset the peer connection on error
        }
      });

      socket.on("ice-candidate", async (candidate) => {
        try {
          if (pc.remoteDescription) {
            await wait(1000); // 1-second delay before adding ICE candidate
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
          await wait(1000); // 1-second delay before creating offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { offer, room });
        } catch (error) {
          console.error("Error creating offer:", error);
          resetPeerConnection(); // Reset the peer connection on error
        }
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(error.message);
    }
  };

  // Cleanup on unmount or room change
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

  // End call and leave the room
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

    // Reset the peer connection for future use
    resetPeerConnection();
  };

  // Toggle audio mute
  const toggleAudio = () => setIsAudioMuted((prev) => !prev);

  // Toggle camera on/off
  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff((prev) => !prev);
    }
  };

  // Toggle microphone mute
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
