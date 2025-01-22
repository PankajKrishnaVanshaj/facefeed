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

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const resolutionOptions = {
    "144p": { width: { ideal: 256 }, height: { ideal: 144 } },
    "240p": { width: { ideal: 426 }, height: { ideal: 240 } },
    "360p": { width: { ideal: 640 }, height: { ideal: 360 } },
    "480p": { width: { ideal: 854 }, height: { ideal: 480 } },
  };

  const measureBandwidth = () => {
    // Placeholder for bandwidth estimation
    const estimatedBandwidth = Math.random() * 3000; // Simulate varying bandwidth
    if (estimatedBandwidth > 2500) return "480p";
    if (estimatedBandwidth > 1500) return "360p";
    if (estimatedBandwidth > 800) return "240p";
    return "144p";
  };

  const optimizeBandwidth = (peerConnection) => {
    if (peerConnection) {
      const videoSender = peerConnection
        .getSenders()
        .find((sender) => sender.track?.kind === "video");

      if (videoSender) {
        const parameters = videoSender.getParameters();
        if (!parameters.encodings) parameters.encodings = [{}];
        parameters.encodings[0].maxBitrate =
          videoResolution === "480p" ? 1500000 : 500000;
        videoSender.setParameters(parameters);
      }
    }
  };

  const adjustResolution = async () => {
    const newResolution = measureBandwidth();
    if (newResolution !== videoResolution) {
      setVideoResolution(newResolution);

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints(resolutionOptions[newResolution]);
        optimizeBandwidth(peerConnectionRef.current);
      }
    }
  };

  useEffect(() => {
    if (!socket) return;

    const setupStream = async () => {
      try {
        const initialResolution = measureBandwidth();
        setVideoResolution(initialResolution);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...resolutionOptions[initialResolution],
            facingMode: "user",
          },
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
          .forEach((track) =>
            peerConnectionRef.current.addTrack(track, stream)
          );

        optimizeBandwidth(peerConnectionRef.current);

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
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setMediaError(error.message);
      }
    };

    setupStream();

    const bandwidthInterval = setInterval(adjustResolution, 5000);

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

  const endCall = () => {
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (localStreamRef.current)
      localStreamRef.current.getTracks().forEach((track) => track.stop());
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
