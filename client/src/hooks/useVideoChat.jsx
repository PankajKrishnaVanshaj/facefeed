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
  const [connectionState, setConnectionState] = useState("disconnected");

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
    // console.log("handleOffer: Received offer", offer);
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn("handleOffer: peerConnection is null, exiting");
        return;
      }
      // console.log(
      //   "handleOffer: current signalingState before setRemoteDescription (offer):",
      //   pc.signalingState
      // );
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // console.log(
      //   "handleOffer: signalingState after setRemoteDescription (offer):",
      //   pc.signalingState
      // );

      const answer = await pc.createAnswer();
      // console.log("handleOffer: Created answer", answer);
      // console.log(
      //   "handleOffer: current signalingState before setLocalDescription (answer):",
      //   pc.signalingState
      // );
      await pc.setLocalDescription(answer);
      // console.log(
      //   "handleOffer: signalingState after setLocalDescription (answer):",
      //   pc.signalingState
      // );

      socket.emit("answer", { answer, room });
      console.log("handleOffer: Emitted answer to server");
    } catch (error) {
      console.error("handleOffer: Error handling offer:", error);
      setConnectionState("error");
    }
  };

  const processPendingIceCandidates = async () => {
    console.log(
      "processPendingIceCandidates: Start processing pending ICE candidates"
    );
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription) {
      // console.log(
      //   "processPendingIceCandidates: remoteDescription is set, processing candidates. Pending candidates count:",
      //   pendingIceCandidates.current.length
      // );
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          // console.log(
          //   "processPendingIceCandidates: Adding ICE candidate",
          //   candidate
          // );
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(
            "processPendingIceCandidates: ICE candidate added successfully"
          );
        } catch (error) {
          console.error(
            "processPendingIceCandidates: Error adding ICE candidate:",
            error
          );
          setConnectionState("error");
        }
      }
      console.log(
        "processPendingIceCandidates: Finished processing pending ICE candidates"
      );
    } else {
      console.log(
        "processPendingIceCandidates: remoteDescription is not yet set, waiting for it."
      );
    }
  };
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
          // console.log("answer: Received answer", answer);
          try {
            const pc = peerConnectionRef.current;
            if (!pc) {
              console.warn("answer: peerConnection is null, exiting");
              return;
            }
            // console.log(
            //   "answer: current signalingState before setRemoteDescription (answer):",
            //   pc.signalingState
            // );
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            // console.log(
            //   "answer: signalingState after setRemoteDescription (answer):",
            //   pc.signalingState
            // );
            await processPendingIceCandidates();
          } catch (error) {
            console.error("answer: Error handling answer:", error);
            endCall()
            setConnectionState("error");
          }
        });
        socket.on("ice-candidate", async (candidate) => {
          try {
            const pc = peerConnectionRef.current;
            if (pc.remoteDescription) {
              // console.log(
              //   "ice-candidate: remoteDescription is set, adding candidate immediately",
              //   candidate
              // );
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              // console.log(
              //   "ice-candidate: remoteDescription is not set, pushing candidate to pending",
              //   candidate
              // );
              pendingIceCandidates.current.push(candidate);
            }
          } catch (error) {
            console.error("ice-candidate: Error adding ICE candidate:", error);
            setConnectionState("error");
          }
        });
        socket.on("ready", async () => {
          console.log("ready: Received ready signal");
          setConnectionState("connecting");
          try {
            const pc = peerConnectionRef.current;
            if (!pc) {
              console.warn("ready: peerConnection is null, exiting");
              return;
            }
            // console.log(
            //   "ready: current signalingState before createOffer:",
            //   pc.signalingState
            // );
            const offer = await pc.createOffer();
            // console.log("ready: Created offer", offer);
            // console.log(
            //   "ready: current signalingState before setLocalDescription (offer):",
            //   pc.signalingState
            // );
            await pc.setLocalDescription(offer);
            // console.log(
            //   "ready: signalingState after setLocalDescription (offer):",
            //   pc.signalingState
            // );
            socket.emit("offer", { offer, room });
            console.log("ready: Emitted offer to server");
          } catch (error) {
            console.error("ready: Error creating offer:", error);
            setConnectionState("error");
          }
        });
        socket.on("leave-room", () => {
          console.log("leave-room: Received leave-room signal");
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
      console.error("setupStream: Error accessing media devices:", error);
      setMediaError(error.message);
      setConnectionState("error");
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
      socket.off("leave-room"); // важно отписать и от leave-room
    };
  }, [room, socket]);

  const endCall = () => {
    setConnectionState("disconnecting");
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
    setConnectionState("disconnected");
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
    connectionState,
  };
};

export default useVideoChat;
