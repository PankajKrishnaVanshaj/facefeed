import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";
import { FiPhoneForwarded } from "react-icons/fi";
import { BsMicMute, BsMic } from "react-icons/bs";
import { GoMute, GoUnmute } from "react-icons/go";
import { BiCamera, BiCameraOff } from "react-icons/bi";

const VideoChat = ({ room }) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [inRoom, setInRoom] = useState(false); // Track if in a room

  // ICE server configuration
  const iceServers = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "turn:TURN_SERVER_URL", // Optional: Add TURN server for better connectivity
        username: "YOUR_TURN_SERVER_USERNAME",
        credential: "YOUR_TURN_SERVER_CREDENTIAL",
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
      parameters.encodings[0].maxBitrate = 3000000; // High bitrate for faster video
      parameters.encodings[0].minBitrate = 1000000;
      sender.setParameters(parameters);
    }
  };

  useEffect(() => {
    if (!socket) return;

    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);
    setIsConnected(socket.connected);

    peerConnectionRef.current = new RTCPeerConnection(iceServers);

    const setupStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 60, max: 60 },
          },
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
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (socket) {
      socket.emit("leave-room", { room });
      socket.emit("delete-room", { room });
    }

    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    socket.off("ready");
    setInRoom(false);
  };

  socket.on("room-deleted", ({ message }) => {
    alert(message);
  });

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
      audioTrack.enabled = !audioTrack.enabled; // Toggle microphone on/off
      setIsMicMuted(!isMicMuted); // Set state to opposite of track.enabled after toggle
    }
  };

  if (mediaError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 text-lg">
          Error accessing media devices: {mediaError}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary-gradient text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return <div>Connecting to the server...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center border-gray-300 rounded-lg overflow-hidden">
        {inRoom ? (
          <div className="h-full flex flex-col">
            <video
              ref={remoteVideoRef}
              autoPlay
              muted={isAudioMuted}
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </div>
        ) : (
          <div className="text-orange-500">Waiting for connection...</div>
        )}
      </div>

      <div className="relative h-1/2 border border-gray-300 rounded-lg overflow-hidden">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />

        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-1 p-1">
          <span
            onClick={toggleCamera}
            className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
          >
            {isCameraOff ? (
              <BiCameraOff className="w-6 h-6 text-secondary" />
            ) : (
              <BiCamera className="w-6 h-6 text-primary" />
            )}
          </span>
          <span
            onClick={toggleMic}
            className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
          >
            {isMicMuted ? (
              <BsMicMute className="w-6 h-6 text-secondary" />
            ) : (
              <BsMic className="w-6 h-6 text-primary" />
            )}
          </span>

          <span
            onClick={toggleAudio}
            className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
          >
            {isAudioMuted ? (
              <GoMute className="w-6 h-6 text-secondary" />
            ) : (
              <GoUnmute className="w-6 h-6 text-primary" />
            )}
          </span>

          <span
            onClick={endCall}
            className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full cursor-pointer hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition ease-in-out duration-150"
          >
            <FiPhoneForwarded className="w-6 h-6 text-white" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
