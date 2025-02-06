import  { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./SocketProvider"; // Assuming you have a SocketProvider

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
  const [callStatus, setCallStatus] = useState("idle"); // "idle", "connecting", "in-call", "ended", "error"

  // **IMPORTANT:** Replace these placeholders with your actual TURN server details in production!
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      { urls: "stun:stun.services.mozilla.com" },
      {
        urls: "turn:your_turn_server_address:3478", // Replace with your TURN server URL (or IP:port)
        username: "your_turn_username", // Replace with your TURN username (if needed)
        credential: "your_turn_password", // Replace with your TURN password (if needed)
      },
    ],
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // **Memoized Socket Event Handlers using useCallback**

  const processPendingIceCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (pc && pc.remoteDescription) {
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(
            "processPendingIceCandidates - Pending ICE candidate added"
          );
        } catch (error) {
          console.error(
            "processPendingIceCandidates - Error adding pending ICE candidate:",
            error
          );
        }
      }
    }
  }, []);

  const handleOffer = useCallback(
    async (offer) => {
      // console.log("handleOffer - Received offer:", offer);
      if (!peerConnectionRef.current) {
        console.warn("handleOffer - Peer connection is null, ignoring offer.");
        return;
      }
      const pc = peerConnectionRef.current;

      try {
        setCallStatus("connecting"); // Update call status

        // Retry logic for setRemoteDescription
        const setRemoteDescriptionWithRetry = async (
          maxRetries = 5,
          delay = 1000
        ) => {
          for (let i = 0; i < maxRetries; i++) {
            if (
              pc.signalingState === "stable" ||
              pc.signalingState === "have-remote-offer"
            ) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                console.log(
                  "handleOffer - setRemoteDescription success on attempt:",
                  i + 1
                );
                return true;
              } catch (error) {
                console.error(
                  "handleOffer - setRemoteDescription error on attempt:",
                  i + 1,
                  error
                );
              }
            } else {
              console.warn(
                `handleOffer - Signaling state not suitable for setRemoteDescription, state: ${
                  pc.signalingState
                }, attempt: ${i + 1}`
              );
            }
            await wait(delay);
          }
          throw new Error(
            `handleOffer - Failed setRemoteDescription after retries, state: ${pc.signalingState}`
          );
        };

        // Retry logic for setLocalDescription (answer)
        const setLocalDescriptionWithRetry = async (
          answer,
          maxRetries = 5,
          delay = 1000
        ) => {
          for (let i = 0; i < maxRetries; i++) {
            if (
              pc.signalingState === "stable" ||
              pc.signalingState === "have-remote-offer" ||
              pc.signalingState === "have-local-offer"
            ) {
              try {
                await pc.setLocalDescription(answer);
                console.log(
                  "handleOffer - setLocalDescription (answer) success on attempt:",
                  i + 1
                );
                return true;
              } catch (error) {
                console.error(
                  "handleOffer - setLocalDescription (answer) error on attempt:",
                  i + 1,
                  error
                );
              }
            } else {
              console.warn(
                `handleOffer - Signaling state not suitable for setLocalDescription (answer), state: ${
                  pc.signalingState
                }, attempt: ${i + 1}`
              );
            }
            await wait(delay);
          }
          throw new Error(
            `handleOffer - Failed setLocalDescription (answer) after retries, state: ${pc.signalingState}`
          );
        };

        const remoteDescriptionSuccess = await setRemoteDescriptionWithRetry();
        if (!remoteDescriptionSuccess) return;

        const answer = await pc.createAnswer();
        const localDescriptionSuccess = await setLocalDescriptionWithRetry(
          answer
        );
        if (!localDescriptionSuccess) return;

        socket.emit("answer", { answer, room });
        // console.log("handleOffer - Answer sent to server:", answer);
      } catch (error) {
        console.error("handleOffer - Error handling offer:", error);
        setCallStatus("error"); // Update call status to error
      }
    },
    [room, socket, setCallStatus]
  );

  const socketAnswerHandler = useCallback(
    async (answer) => {
      // console.log("socketAnswerHandler - Received answer:", answer);
      if (!peerConnectionRef.current) {
        console.warn(
          "socketAnswerHandler - Peer connection is null, ignoring answer."
        );
        return;
      }
      const pc = peerConnectionRef.current;

      try {
        setCallStatus("connecting"); // Update call status

        // Retry logic for setRemoteDescription (answer handler)
        const setRemoteDescriptionForAnswerWithRetry = async (
          answerPayload,
          maxRetries = 5,
          delay = 1000
        ) => {
          for (let i = 0; i < maxRetries; i++) {
            if (
              pc.signalingState === "stable" ||
              pc.signalingState === "have-local-offer"
            ) {
              try {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(answerPayload)
                );
                console.log(
                  "socketAnswerHandler - setRemoteDescription success on attempt:",
                  i + 1
                );
                return true;
              } catch (error) {
                console.error(
                  "socketAnswerHandler - setRemoteDescription error on attempt:",
                  i + 1,
                  error
                );
              }
            } else {
              console.warn(
                `socketAnswerHandler - Signaling state not suitable for setRemoteDescription, state: ${
                  pc.signalingState
                }, attempt: ${i + 1}`
              );
            }
            await wait(delay);
          }
          throw new Error(
            `socketAnswerHandler - Failed setRemoteDescription after retries, state: ${pc.signalingState}`
          );
        };

        const remoteDescriptionSetSuccess =
          await setRemoteDescriptionForAnswerWithRetry(answer);
        if (!remoteDescriptionSetSuccess) return;

        await processPendingIceCandidates();
        setCallStatus("in-call"); // Update call status to in-call on successful answer processing
      } catch (error) {
        console.error("socketAnswerHandler - Error handling answer:", error);
        setCallStatus("error"); // Update call status to error
      }
    },
    [processPendingIceCandidates, setCallStatus]
  );

  const socketIceCandidateHandler = useCallback(async (candidate) => {
    if (!peerConnectionRef.current) {
      console.warn(
        "socketIceCandidateHandler - Peer connection is null, ignoring ICE candidate."
      );
      return;
    }
    const pc = peerConnectionRef.current;

    try {
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(
            "socketIceCandidateHandler - ICE candidate added successfully"
          );
        } catch (error) {
          console.error(
            "socketIceCandidateHandler - Error adding ICE candidate:",
            error
          );
        }
      } else {
        pendingIceCandidates.current.push(candidate);
        console.log(
          "socketIceCandidateHandler - Pending ICE candidate added to queue."
        );
      }
    } catch (error) {
      console.error(
        "socketIceCandidateHandler - Error handling ice-candidate:",
        error
      );
    }
  }, []);

  const socketReadyHandler = useCallback(async () => {
    console.log("socketReadyHandler - Received 'ready' event from server.");
    if (!peerConnectionRef.current) {
      console.warn(
        "socketReadyHandler - Peer connection is null, ignoring 'ready' event."
      );
      return;
    }
    const pc = peerConnectionRef.current;

    try {
      // Logic for offer initiation - you might need to adjust this based on your server-side logic
      const shouldInitiateOffer = true; // Assuming this client always initiates for simplicity

      if (shouldInitiateOffer) {
        // Retry logic for setLocalDescription (offer)
        const setLocalDescriptionForOfferWithRetry = async (
          offerPayload,
          maxRetries = 5,
          delay = 1000
        ) => {
          for (let i = 0; i < maxRetries; i++) {
            if (pc.signalingState === "stable") {
              try {
                await pc.setLocalDescription(offerPayload);
                console.log(
                  "socketReadyHandler - setLocalDescription (offer) success on attempt:",
                  i + 1
                );
                return true;
              } catch (error) {
                console.error(
                  "socketReadyHandler - setLocalDescription (offer) error on attempt:",
                  i + 1,
                  error
                );
              }
            } else {
              console.warn(
                `socketReadyHandler - Signaling state not stable for setLocalDescription (offer), state: ${
                  pc.signalingState
                }, attempt: ${i + 1}`
              );
            }
            await wait(delay);
          }
          throw new Error(
            `socketReadyHandler - Failed setLocalDescription (offer) after retries, state: ${pc.signalingState}`
          );
        };

        const offer = await pc.createOffer();
        const offerSetSuccess = await setLocalDescriptionForOfferWithRetry(
          offer
        );
        if (!offerSetSuccess) return;

        socket.emit("offer", { offer, room });
        // console.log("socketReadyHandler - Offer sent to server:", offer);
        setCallStatus("connecting"); // Update call status
      } else {
        console.log(
          "socketReadyHandler - Not initiating offer, waiting for offer from other peer."
        );
      }
    } catch (error) {
      console.error("socketReadyHandler - Error creating offer:", error);
      setCallStatus("error"); // Update call status to error
    }
  }, [room, socket, setCallStatus]);

  const setupStream = useCallback(async () => {
    // console.log("setupStream - Starting stream setup for room:", room);
    setCallStatus("connecting"); // Update call status to connecting

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      await wait(1000); // Wait for media devices to be ready
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus("in-call"); // Update call status to in-call when remote stream starts
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, room });
          // console.log(
          //   "setupStream - ICE candidate emitted to server:",
          //   event.candidate
          // );
        }
      };

      pc.onsignalingstatechange = () => {
        console.log("setupStream - Signaling state change:", pc.signalingState);
      };

      pc.onconnectionstatechange = () => {
        console.log(
          "setupStream - Connection state change:",
          pc.connectionState
        );
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          console.warn(
            "setupStream - Peer connection state is not healthy:",
            pc.connectionState
          );
          setCallStatus("error"); // Update call status to error
          // Consider adding reconnection logic or UI feedback here.
        } else if (pc.connectionState === "connected") {
          setCallStatus("in-call"); // Ensure call status is "in-call" when fully connected
        }
      };

      socket.emit("join-room", { room });
      setInRoom(true);
      setMediaError(null); // Clear any previous media errors if setup is successful

      // Attach socket event listeners using memoized handlers
      socket.on("offer", handleOffer);
      socket.on("answer", socketAnswerHandler);
      socket.on("ice-candidate", socketIceCandidateHandler);
      socket.on("ready", socketReadyHandler);

      console.log("setupStream - Socket event listeners attached.");
    } catch (error) {
      console.error("setupStream - Error accessing media devices:", error);
      setMediaError(error.message);
      setCallStatus("error"); // Update call status to error
    }
  }, [
    room,
    socket,
    handleOffer,
    socketAnswerHandler,
    socketIceCandidateHandler,
    socketReadyHandler,
    setCallStatus,
  ]);

  useEffect(() => {
    if (!socket || !room) return; // Ensure socket and room are available

    // console.log(
    //   "useEffect - Room changed or socket updated, setting up stream for room:",
    //   room
    // );
    setCallStatus("idle"); // Reset call status when room changes

    setupStream(); // Call setupStream when room changes or socket is available

    return () => {
      // console.log("useEffect Cleanup - Room:", room);
      setCallStatus("ended"); // Update call status to ended during cleanup

      if (peerConnectionRef.current) {
        console.log("useEffect Cleanup - Closing peer connection");
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onsignalingstatechange = null;
        peerConnectionRef.current.onconnectionstatechange = null;

        peerConnectionRef.current.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.enabled = false;
            sender.track.stop();
            peerConnectionRef.current.removeTrack(sender);
          }
        });
        peerConnectionRef.current.getReceivers().forEach((receiver) => {
          if (receiver.track) {
            receiver.track.enabled = false;
            receiver.track.stop();
          }
        });
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
        console.log(
          "useEffect Cleanup - Peer connection closed and dereferenced"
        );
      }

      if (localStreamRef.current) {
        console.log("useEffect Cleanup - Stopping local stream tracks");
        localStreamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
        localStreamRef.current = null;
        localVideoRef.current.srcObject = null;
        console.log(
          "useEffect Cleanup - Local stream tracks stopped and dereferenced"
        );
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
        console.log(
          "useEffect Cleanup - Remote video element srcObject cleared"
        );
      }

      if (socket) {
        console.log("useEffect Cleanup - Removing socket event listeners");
        socket.off("offer", handleOffer);
        socket.off("answer", socketAnswerHandler);
        socket.off("ice-candidate", socketIceCandidateHandler);
        socket.off("ready", socketReadyHandler);
        console.log("useEffect Cleanup - Socket event listeners removed");
      }

      pendingIceCandidates.current = [];
      console.log("useEffect Cleanup - Pending ICE candidates cleared");
      setInRoom(false); // Ensure inRoom is set to false on cleanup
    };
  }, [
    room,
    socket,
    setupStream,
    handleOffer,
    socketAnswerHandler,
    socketIceCandidateHandler,
    socketReadyHandler,
  ]); // Dependencies include memoized handlers and setupStream

  const endCall = useCallback(() => {
    console.log("endCall - Function triggered");
    setCallStatus("ended"); // Update call status to ended
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);

    if (peerConnectionRef.current) {
      console.log("endCall - Closing peer connection");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      console.log("endCall - Stopping local stream");
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    socket.emit("leave-room", { room });
    setInRoom(false);
    console.log("endCall - Function completed");
  }, [room, socket]);

  const toggleAudio = useCallback(() => setIsAudioMuted((prev) => !prev), []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff((prev) => !prev);
    }
  }, []);

  const toggleMic = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted((prev) => !prev);
    }
  }, []);

  return {
    localVideoRef,
    remoteVideoRef,
    isAudioMuted,
    isMicMuted,
    isCameraOff,
    inRoom,
    mediaError,
    callStatus, // Expose callStatus to the component
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  };
};

export default useVideoChat;
