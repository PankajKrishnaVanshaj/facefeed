import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider";

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]); // Queue for pending ICE candidates
  const socketOfferHandler = useRef(null); // useRef for socket event handlers
  const socketAnswerHandler = useRef(null);
  const socketIceCandidateHandler = useRef(null);
  const socketReadyHandler = useRef(null);

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

  const handleOffer = async (offer) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      console.log(
        "Handling offer, current signaling state:",
        pc.signalingState
      ); // ADDED LOGGING
      // console.log("Offer received:", offer); // ADDED LOGGING

      const setRemoteDescriptionWithRetry = async (
        maxRetries = 5,
        delay = 1000
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          console.log(
            `Attempt ${
              i + 1
            }/${maxRetries} - Signaling state before setRemoteDescription:`,
            pc.signalingState
          ); // ADDED LOGGING
          if (
            pc.signalingState === "stable" ||
            pc.signalingState === "have-remote-offer"
          ) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              console.log("setRemoteDescription successful on attempt:", i + 1); // ADDED LOGGING
              return true;
            } catch (error) {
              console.error(
                "setRemoteDescription error on attempt:",
                i + 1,
                error
              ); // ADDED LOGGING
            }
          } else {
            console.warn(
              `Signaling state not suitable for setRemoteDescription, state: ${
                pc.signalingState
              }, attempt: ${i + 1}` // ADDED LOGGING
            );
          }
          // Wait and retry
          await wait(delay);
          console.warn(
            `Retrying setRemoteDescription, attempt ${
              i + 1
            }/${maxRetries}, state: ${pc.signalingState}`
          );
        }
        throw new Error(
          `Failed to set remote description after ${maxRetries} retries, state: ${pc.signalingState}`
        );
      };

      const setLocalDescriptionWithRetry = async (
        answer,
        maxRetries = 5,
        delay = 1000
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          if (
            pc.signalingState === "stable" ||
            pc.signalingState === "have-remote-offer" ||
            pc.signalingState === "have-local-offer" // Include have-local-offer state
          ) {
            await pc.setLocalDescription(answer);
            return true;
          }
          // Wait and retry
          await wait(delay);
          console.warn(
            `Retrying setLocalDescription (answer), attempt ${
              i + 1
            }/${maxRetries}, state: ${pc.signalingState}`
          );
        }
        throw new Error(
          `Failed to set local description (answer) after ${maxRetries} retries, state: ${pc.signalingState}`
        );
      };

      const success = await setRemoteDescriptionWithRetry();
      if (!success) return;

      // Create and set the local answer
      const answer = await pc.createAnswer();

      let answerSetSuccess = false;
      try {
        answerSetSuccess = await setLocalDescriptionWithRetry(answer);
      } catch (error) {
        console.error(
          "Error setting local description (answer) after retries:",
          error
        );
        return; // Exit if setting local description fails even after retries
      }

      if (!answerSetSuccess) {
        console.error(
          "Failed to set local description (answer) even with retry mechanism."
        );
        return;
      }

      // Emit the answer to the signaling server
      socket.emit("answer", { answer, room });
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

      await wait(1000); // 1-second delay to ensure media devices are ready
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current)
          remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", { candidate: event.candidate, room });
        }
      };

      pc.onsignalingstatechange = () => {
        console.log("Signaling state change:", pc.signalingState);
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state change:", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          console.warn(
            "Peer connection state is not healthy:",
            pc.connectionState
          );
          // Optionally handle reconnection or display an error to the user
        }
      };

      socket.emit("join-room", { room });
      setInRoom(true);

      // Store socket event handlers in useRef
      socketOfferHandler.current = handleOffer;
      socketAnswerHandler.current = async (answer) => {
        try {
          const pc = peerConnectionRef.current;
          if (!pc) return;

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
                await pc.setRemoteDescription(
                  new RTCSessionDescription(answerPayload)
                );
                return true;
              }
              // Wait and retry
              await wait(delay);
              console.warn(
                `Retrying setRemoteDescription (answer handler), attempt ${
                  i + 1
                }/${maxRetries}, state: ${pc.signalingState}`
              );
            }
            throw new Error(
              `Failed to set remote description (answer handler) after ${maxRetries} retries, state: ${pc.signalingState}`
            );
          };

          let remoteDescriptionSetSuccess = false;
          try {
            remoteDescriptionSetSuccess =
              await setRemoteDescriptionForAnswerWithRetry(answer);
          } catch (error) {
            console.error(
              "Error setting remote description (answer handler) after retries:",
              error
            );
            return; // Exit if setting remote description fails even after retries
          }

          if (!remoteDescriptionSetSuccess) {
            console.error(
              "Failed to set remote description (answer handler) even with retry mechanism."
            );
            return;
          }
          await processPendingIceCandidates();
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      };
      socketIceCandidateHandler.current = async (candidate) => {
        try {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
            }
          } else {
            pendingIceCandidates.current.push(candidate);
          }
        } catch (error) {
          console.error("Error handling ice-candidate:", error);
        }
      };
      socketReadyHandler.current = async () => {
        try {
          const pc = peerConnectionRef.current;
          if (!pc) return;

          // **Simple Client-Side Check - May need server-side logic for robustness**
          // Let's assume if we are the *first* to receive "ready", we initiate the offer.
          // This is a simplification and might not be foolproof in all scenarios.
          const shouldInitiateOffer = true; // For now, assume this client always initiates.
          // In a real app, you'd need a better way to determine this.

          if (shouldInitiateOffer) {
            // ADD THIS CONDITIONAL CHECK
            const setLocalDescriptionForOfferWithRetry = async (
              offerPayload,
              maxRetries = 5,
              delay = 1000
            ) => {
              for (let i = 0; i < maxRetries; i++) {
                if (pc.signalingState === "stable") {
                  await pc.setLocalDescription(offerPayload);
                  return true;
                }
                // Wait and retry
                await wait(delay);
                console.warn(
                  `Retrying setLocalDescription (offer), attempt ${
                    i + 1
                  }/${maxRetries}, state: ${pc.signalingState}`
                );
              }
              throw new Error(
                `Failed to set local description (offer) after ${maxRetries} retries, state: ${pc.signalingState}`
              );
            };

            const offer = await pc.createOffer();

            let offerSetSuccess = false;
            try {
              offerSetSuccess = await setLocalDescriptionForOfferWithRetry(
                offer
              );
            } catch (error) {
              console.error(
                "Error setting local description (offer) after retries:",
                error
              );
              return; // Exit if setting local description fails even after retries
            }

            if (!offerSetSuccess) {
              console.error(
                "Failed to set local description (offer) even with retry mechanism."
              );
              return;
            }
            socket.emit("offer", { offer, room });
          } else {
            console.log(
              "Not initiating offer, waiting for offer from other peer."
            ); // ADDED LOGGING
            // If not initiating, we simply wait for the 'offer' event from the other peer.
          }
        } catch (error) {
          console.error("Error creating offer:", error);
        }
      };

      socket.on("offer", socketOfferHandler.current);
      socket.on("answer", socketAnswerHandler.current);
      socket.on("ice-candidate", socketIceCandidateHandler.current);
      socket.on("ready", socketReadyHandler.current);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(error.message);
    }
  };

  useEffect(() => {
    if (!socket) return;

    setupStream();

    return () => {
      console.log("Cleanup useEffect triggered");
      // Cleanup function to prevent memory leaks
      if (peerConnectionRef.current) {
        console.log("Closing peer connection");
        peerConnectionRef.current.ontrack = null; // Remove track event handler
        peerConnectionRef.current.onicecandidate = null; // Remove ICE candidate handler
        peerConnectionRef.current.onsignalingstatechange = null; // Remove signaling state handler
        peerConnectionRef.current.onconnectionstatechange = null; // Remove connection state handler

        peerConnectionRef.current.getSenders().forEach((sender) => {
          // Clean up senders
          if (sender.track) {
            sender.track.enabled = false;
            sender.track.stop();
            peerConnectionRef.current.removeTrack(sender);
          }
        });
        peerConnectionRef.current.getReceivers().forEach((receiver) => {
          // Clean up receivers
          if (receiver.track) {
            receiver.track.enabled = false;
            receiver.track.stop();
          }
        });
        peerConnectionRef.current.close(); // Close the peer connection
        peerConnectionRef.current = null; // Dereference the peer connection
        console.log("Peer connection closed and dereferenced");
      }

      if (localStreamRef.current) {
        console.log("Stopping local stream tracks");
        localStreamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop(); // Stop each track in the local stream
        });
        localStreamRef.current = null; // Dereference the local stream
        localVideoRef.current.srcObject = null; // Clear local video element's srcObject
        console.log("Local stream tracks stopped and dereferenced");
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null; // Clear remote video element's srcObject
      }

      if (socket) {
        console.log("Removing socket event listeners");
        socket.off("offer", socketOfferHandler.current);
        socket.off("answer", socketAnswerHandler.current);
        socket.off("ice-candidate", socketIceCandidateHandler.current);
        socket.off("ready", socketReadyHandler.current);
        console.log("Socket event listeners removed");
      }

      pendingIceCandidates.current = []; // Clear pending ICE candidates
      console.log("Pending ICE candidates cleared");
    };
  }, [room, socket]);

  const endCall = () => {
    console.log("End call function triggered");
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);

    if (peerConnectionRef.current) {
      console.log("Closing peer connection in endCall");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      console.log("Stopping local stream in endCall");
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
    console.log("End call function completed");
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
