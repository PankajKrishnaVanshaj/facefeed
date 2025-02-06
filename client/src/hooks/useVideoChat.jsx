import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]);

  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected"); // Added connectionState

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

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { answer, room });
    } catch (error) {
      console.error("Error handling offer:", error);
      setConnectionState("error"); // Set connectionState to error
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
          setConnectionState("error"); // Set connectionState to error
        }
      }
    }
  };
  const setupStream = async () => {
    setConnectionState("connecting"); // Set connectionState to connecting
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
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await processPendingIceCandidates();
          } catch (error) {
            console.error("Error handling answer:", error);
            setConnectionState("error"); // Set connectionState to error
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
            setConnectionState("error"); // Set connectionState to error
          }
        });
        socket.on("ready", async () => {
          setConnectionState("connecting"); // Set connectionState to connecting on 'ready'
          try {
            const pc = peerConnectionRef.current;
            if (!pc) return;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { offer, room });
          } catch (error) {
            console.error("Error creating offer:", error);
            setConnectionState("error"); // Set connectionState to error
          }
        });
        socket.on("hang-up", () => {
          // Handle hang-up event
          console.log("Received hang-up signal");
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
        });
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(error.message);
      setConnectionState("error"); // Set connectionState to error
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
      socket.off("hang-up"); // Off hang-up event listener
    };
  }, [room, socket]);

  const endCall = () => {
    setConnectionState("disconnecting"); // Set connectionState to disconnecting
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
    socket.emit("hang-up", { room }); // Emit hang-up event
    socket.emit("leave-room", { room });
    setInRoom(false);
    setConnectionState("disconnected"); // Set connectionState to disconnected
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
    connectionState, // Return connectionState to be used in UI
  };
};

export default useVideoChat;
