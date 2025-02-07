import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();

  // Refs for managing video/audio streams and peer connection
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]);

  // State variables for UI and connection management
  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected");

  // STUN servers configuration for WebRTC
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

  /**
   * Initializes the RTCPeerConnection and sets up event listeners.
   */
  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Handle incoming tracks (remote video/audio)
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

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
        setConnectionState("error");
      }
    };

    // Handle signaling state changes
    pc.onsignalingstatechange = () => {
      console.log("Signaling state:", pc.signalingState);
      if (pc.signalingState === "closed") {
        setConnectionState("disconnected");
      }
    };
  };

  /**
   * Handles incoming SDP offer from the remote peer.
   */
  const handleOffer = async (offer) => {
    // console.log("handleOffer: Received offer", offer);
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn("handleOffer: PeerConnection is null, exiting");
        return;
      }

      // Ensure the signaling state is stable before setting the remote description
      if (pc.signalingState !== "stable") {
        console.error(
          "handleOffer: Cannot set remote description in signaling state:",
          pc.signalingState
        );
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { answer, room });
    } catch (error) {
      console.error("handleOffer: Error handling offer:", error);
      setConnectionState("error");
    }
  };

  /**
   * Processes pending ICE candidates once the remote description is set.
   */
  const processPendingIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription) {
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error(
            "processPendingIceCandidates: Error adding ICE candidate:",
            error
          );
          setConnectionState("error");
        }
      }
    }
  };

  /**
   * Sets up the local media stream and initializes the RTCPeerConnection.
   */
  const setupStream = async () => {
    setConnectionState("connecting");
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

      initializePeerConnection();

      stream
        .getTracks()
        .forEach((track) => peerConnectionRef.current.addTrack(track, stream));

      if (room) {
        socket.emit("join-room", { room });
        setInRoom(true);

        socket.on("offer", handleOffer);

        socket.on("answer", async (answer) => {
          try {
            const pc = peerConnectionRef.current;
            if (!pc) return;

            // Ensure the signaling state is have-remote-offer before setting the remote description
            if (pc.signalingState !== "have-remote-offer") {
              console.error(
                "answer: Cannot set remote description in signaling state:",
                pc.signalingState
              );
              return;
            }

            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await processPendingIceCandidates();
          } catch (error) {
            console.error("answer: Error handling answer:", error);
            setConnectionState("error");
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
            console.error("ice-candidate: Error adding ICE candidate:", error);
            setConnectionState("error");
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
            console.error("ready: Error creating offer:", error);
            setConnectionState("error");
          }
        });

        socket.on("leave-room", () => {
          cleanupResources();
        });
      }
    } catch (error) {
      console.error("setupStream: Error accessing media devices:", error);
      setMediaError(error.message);
      setConnectionState("error");
    }
  };

  /**
   * Cleans up resources when leaving the room or disconnecting.
   */
  const cleanupResources = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setInRoom(false);
    setConnectionState("disconnected");
  };

  /**
   * Ends the call and cleans up resources.
   */
  const endCall = () => {
    setConnectionState("disconnecting");
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);
    cleanupResources();
    socket.emit("leave-room", { room });
  };

  /**
   * Toggles audio mute state.
   */
  const toggleAudio = () => setIsAudioMuted((prev) => !prev);

  /**
   * Toggles camera on/off state.
   */
  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff((prev) => !prev);
    }
  };

  /**
   * Toggles microphone mute state.
   */
  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted((prev) => !prev);
    }
  };

  // Cleanup effect on unmount
  useEffect(() => {
    if (!socket) return;

    setupStream();

    return () => {
      cleanupResources();
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("ready");
      socket.off("leave-room");
    };
  }, [room, socket]);

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
    connectionState,
  };
};

export default useVideoChat;
