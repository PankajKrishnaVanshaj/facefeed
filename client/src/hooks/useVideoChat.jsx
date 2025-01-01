import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  // const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false);

  const iceServers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun.l.google.com:19302",
        ],
        //  urls: ["stun:stun.l.google.com:19302"],
      },
    ],
  };

  const optimizeBandwidth = (peerConnection) => {
    const sender = peerConnection
      .getSenders()
      .find((s) => s.track.kind === "video");
    if (sender) {
      const parameters = sender.getParameters();
      if (!parameters.encodings) {
        parameters.encodings = [{}];
      }
      parameters.encodings[0].maxBitrate = 2500000; // Adjust bitrate for speed
      parameters.encodings[0].minBitrate = 500000;
      sender.setParameters(parameters);
    }
  };

  useEffect(() => {
    if (!socket) return;

    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);

    // setIsConnected(socket.connected);

    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    const setupStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 }, // Lower resolution for faster connections
            height: { ideal: 360 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        localStreamRef.current = stream;

        stream
          .getTracks()
          .forEach((track) =>
            peerConnectionRef.current.addTrack(track, stream)
          );

        optimizeBandwidth(peerConnectionRef.current);

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
        } else {
          setInRoom(false);
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        setMediaError(error.message);
      }
    };

    setupStream();

    return () => {
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
    // Close the WebRTC peer connection if it exists
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop the local media tracks (audio and video)
    // if (localStreamRef.current) {
    //   localStreamRef.current.getTracks().forEach((track) => track.stop());
    //   localStreamRef.current.getAudioTracks().forEach((track) => track.stop());
    // }

    // Leave the room and emit a delete-room event to notify others
    if (socket && room) {
      socket.emit("leave-room", { room });
      socket.emit("delete-room", { room });
    }

    // Remove all socket event listeners to prevent memory leaks
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("ready");

    // Reset connection status and state
    setInRoom(false);

    // Optionally, you can reset other states if needed
    setIsAudioMuted(false);
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const toggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!isCameraOff);
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
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  };
};

export default useVideoChat;
