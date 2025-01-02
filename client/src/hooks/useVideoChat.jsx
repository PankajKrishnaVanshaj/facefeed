import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [videoResolution, setVideoResolution] = useState("144p");
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const bitrateMap = {
    "144p": 300000,
    "240p": 500000,
    "360p": 800000,
    "480p": 1000000,
    "720p": 2000000,
    "1080p": 3000000,
  };

  const resolutionOptions = {
    "144p": { width: { ideal: 256 }, height: { ideal: 144 } },
    "240p": { width: { ideal: 426 }, height: { ideal: 240 } },
    "360p": { width: { ideal: 640 }, height: { ideal: 360 } },
    "480p": { width: { ideal: 854 }, height: { ideal: 480 } },
    "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
    "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } },
  };
  const measureBandwidth = () => {
    // Replace this with real bandwidth estimation logic
    const estimatedBandwidth = Math.random() * 3000; // Placeholder
    if (estimatedBandwidth > 2500) return "1080p";
    if (estimatedBandwidth > 1500) return "720p";
    if (estimatedBandwidth > 800) return "480p";
    if (estimatedBandwidth > 400) return "360p";
    if (estimatedBandwidth > 200) return "240p";
    return "144p";
  };

  const optimizeBandwidth = (peerConnection, videoResolution) => {
    if (peerConnectionRef.current) {
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track.kind === "video");
      if (sender) {
        const parameters = sender.getParameters();
        if (!parameters.encodings) {
          parameters.encodings = [{}];
        }
        parameters.encodings[0].maxBitrate =
          bitrateMap[videoResolution] || 300000;
        sender.setParameters(parameters);
      }
    }
  };

  const adjustResolution = async () => {
    const newResolution = await measureBandwidth();
    if (newResolution !== videoResolution) {
      setVideoResolution(newResolution);

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints(resolutionOptions[newResolution]);
        optimizeBandwidth(peerConnectionRef.current, newResolution);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);

    const setupStream = async () => {
      try {
        setConnectionStatus("Connecting...");
        const initialResolution = await measureBandwidth();
        setVideoResolution(initialResolution);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: resolutionOptions[initialResolution],
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;

        peerConnectionRef.current = new RTCPeerConnection(iceServers);
        stream
          .getTracks()
          .forEach((track) =>
            peerConnectionRef.current.addTrack(track, stream)
          );

        optimizeBandwidth(peerConnectionRef.current, initialResolution);

        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", { candidate: event.candidate, room });
          }
        };

        if (room) {
          socket.emit("join-room", { room });
          setInRoom(true);

          socket.on("offer", async (offer) => {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(offer)
            );
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit("answer", { answer, room });
          });

          socket.on("answer", async (answer) => {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
          });

          socket.on("ice-candidate", async (candidate) => {
            if (candidate) {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            }
          });

          socket.on("ready", async () => {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit("offer", { offer, room });
          });

          socket.on("connection-error", attemptReconnect);
        } else {
          setInRoom(false);
        }

        setConnectionStatus("Connected");
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setMediaError(error.message);
        setConnectionStatus("Failed to connect");
      }
    };

    setupStream();

    const bandwidthInterval = setInterval(adjustResolution, 5000); // Check every 5 seconds

    return () => {
      clearInterval(bandwidthInterval);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("ready");
    };
  }, [room, socket]);

  const attemptReconnect = () => {
    if (reconnectAttempts < 3) {
      setReconnectAttempts((prev) => prev + 1);
      setConnectionStatus("Reconnecting...");
      setupStream();
    } else {
      setConnectionStatus("Failed to connect");
    }
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop the local media tracks (audio and video)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      // localStreamRef.current.getAudioTracks().forEach((track) => track.stop());
    }

    if (socket && room) {
      socket.emit("leave-room", { room });
      socket.emit("delete-room", { room });
    }

    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("ready");

    setInRoom(false);
    setIsAudioMuted(false);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setConnectionStatus("Disconnected");
  };

  const toggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!isCameraOff);
      if (!isCameraOff) {
        setVideoResolution("240p");
      }
    }
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!isMicMuted);
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
    connectionStatus,
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  };
};

export default useVideoChat;
