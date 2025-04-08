import { useEffect, useRef, useState } from "react";
import { useSocket } from "./SocketProvider"; // Assuming SocketProvider.js is in the same directory or configured path

const useVideoChat = (room) => {
  const socket = useSocket();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingIceCandidates = useRef([]); // Stores candidates arriving before remote description is set

  const [mediaError, setMediaError] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false); // Mute remote audio output
  const [isMicMuted, setIsMicMuted] = useState(false); // Mute local microphone input
  const [isCameraOff, setIsCameraOff] = useState(false); // Turn off local camera input
  const [inRoom, setInRoom] = useState(false);
  const [connectionState, setConnectionState] = useState("disconnected"); // disconnected, connecting, connected, failed, disconnecting, error

  // Configuration for STUN servers
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
      { urls: "stun:stun.services.mozilla.com" },
      // Add more servers if needed
    ],
  };

  // --- Signaling Handlers ---

  // Handles incoming offer from the remote peer
  const handleOffer = async (offer) => {
    console.log("handleOffer: Received offer");
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn("handleOffer: peerConnection is null, ignoring offer.");
      return;
    }

    console.log(
      "handleOffer: Current signalingState before processing offer:",
      pc.signalingState
    );

    // --- Glare Handling (Basic) ---
    // If we are in the middle of sending our own offer, or already connected,
    // we might need to decide who takes precedence or ignore the incoming offer.
    // A simple approach: ignore if not stable. More complex logic might involve rollback.
    if (pc.signalingState !== "stable") {
      console.warn(
        `handleOffer: Received offer in non-stable state (${pc.signalingState}). Potentially glare. Ignoring offer for now.`
      );
      // In a more robust implementation, you might implement rollback here.
      return;
    }

    try {
      console.log("handleOffer: Setting remote description (offer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(
        "handleOffer: Set remote description success. New signalingState:",
        pc.signalingState // Expected: have-remote-offer
      );

      // Ensure state is correct before creating/setting answer
      if (pc.signalingState !== "have-remote-offer") {
          console.error(
            `handleOffer: State after setRemoteDescription was ${pc.signalingState}, expected 'have-remote-offer'. Aborting answer creation.`
          );
          // Perhaps close the connection or signal an error
          setConnectionState("error");
          return;
      }

      console.log("handleOffer: Creating answer...");
      const answer = await pc.createAnswer();
      console.log("handleOffer: Created answer.");

      console.log(
        "handleOffer: Current signalingState before setting local description (answer):",
        pc.signalingState // Expected: have-remote-offer
      );

      // *** CRITICAL CHECK: Ensure state before setting local description ***
      if (pc.signalingState === "have-remote-offer") {
        console.log("handleOffer: Setting local description (answer)...");
        await pc.setLocalDescription(answer);
        console.log(
          "handleOffer: Set local description success. New signalingState:",
          pc.signalingState // Expected: stable
        );

        console.log("handleOffer: Emitting answer to server...");
        socket.emit("answer", { answer, room });
        console.log("handleOffer: Emitted answer.");
      } else {
        // This is where the original error likely happened.
        console.error(
          `handleOffer: Cannot set local answer because signalingState is ${pc.signalingState} (expected 'have-remote-offer'). Aborting.`
        );
        // Consider cleanup or error signaling
        setConnectionState("error");
      }

    } catch (error) {
      console.error("handleOffer: Error handling offer:", error);
       if (pc) {
         console.error("handleOffer: Signaling state at time of error:", pc.signalingState);
       }
      setConnectionState("error");
    }
  };

  // Handles incoming answer from the remote peer
  const handleAnswer = async (answer) => {
    console.log("handleAnswer: Received answer");
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn("handleAnswer: peerConnection is null, ignoring answer.");
      return;
    }

    console.log(
        "handleAnswer: Current signalingState before setRemoteDescription (answer):",
        pc.signalingState // Expected: have-local-offer
      );

    // We should only accept an answer if we have previously sent an offer
    if (pc.signalingState !== "have-local-offer") {
        console.warn(
          `handleAnswer: Received answer in unexpected state ${pc.signalingState} (expected 'have-local-offer'). Ignoring.`
        );
        return;
      }

    try {
      console.log("handleAnswer: Setting remote description (answer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(
        "handleAnswer: Set remote description success. New signalingState:",
        pc.signalingState // Expected: stable
      );

      // Process any queued ICE candidates now that the remote description is set
      await processPendingIceCandidates();

      // If state becomes stable, connection is likely established (pending ICE)
      if(pc.signalingState === 'stable') {
        // Note: 'connected' state is usually determined by 'connectionstatechange' event
        console.log("handleAnswer: Negotiation complete (stable state reached).");
      }

    } catch (error) {
      console.error("handleAnswer: Error handling answer:", error);
      if (pc) {
         console.error("handleAnswer: Signaling state at time of error:", pc.signalingState);
       }
      setConnectionState("error");
    }
  };

  // Handles incoming ICE candidates from the remote peer
  const handleIceCandidate = async (candidate) => {
    console.log("handleIceCandidate: Received ICE candidate");
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn("handleIceCandidate: peerConnection is null, ignoring candidate.");
      return;
    }

    try {
      const rtcIceCandidate = new RTCIceCandidate(candidate);
      // Check if remote description is set. If not, queue the candidate.
      if (pc.remoteDescription && pc.remoteDescription.type) {
        console.log("handleIceCandidate: remoteDescription is set. Adding candidate immediately.");
        await pc.addIceCandidate(rtcIceCandidate);
        console.log("handleIceCandidate: Added ICE candidate successfully.");
      } else {
        console.log("handleIceCandidate: remoteDescription not set. Queuing candidate.");
        pendingIceCandidates.current.push(rtcIceCandidate); // Push the actual RTCIceCandidate object
      }
    } catch (error) {
      // Ignore error caused by duplicate candidates
      if (error.name === 'OperationError' || (error.message && error.message.includes("Error processing ICE candidate"))) {
        console.warn("handleIceCandidate: Ignoring error adding ICE candidate (possibly duplicate or invalid):", error.message);
      } else {
        console.error("handleIceCandidate: Error adding ICE candidate:", error);
        setConnectionState("error");
      }
    }
  };

  // Process ICE candidates that arrived before the remote description was set
  const processPendingIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      console.log("processPendingIceCandidates: Cannot process yet, remote description not set.");
      return;
    }

    if (pendingIceCandidates.current.length > 0) {
      console.log(
        `processPendingIceCandidates: Processing ${pendingIceCandidates.current.length} pending ICE candidates.`
      );
      while (pendingIceCandidates.current.length > 0) {
        const candidate = pendingIceCandidates.current.shift();
        try {
          console.log("processPendingIceCandidates: Adding pending candidate:", candidate);
          await pc.addIceCandidate(candidate);
          console.log("processPendingIceCandidates: Added pending candidate successfully.");
        } catch (error) {
           if (error.name === 'OperationError' || (error.message && error.message.includes("Error processing ICE candidate"))) {
             console.warn("processPendingIceCandidates: Ignoring error adding pending ICE candidate (possibly duplicate or invalid):", error.message);
           } else {
             console.error("processPendingIceCandidates: Error adding pending ICE candidate:", error);
             // Consider if this should set the connection state to error
           }
        }
      }
      console.log("processPendingIceCandidates: Finished processing pending candidates.");
    } else {
        console.log("processPendingIceCandidates: No pending candidates to process.");
    }
  };

  // Handles the 'ready' signal from the server (usually indicating another peer joined)
  const handleReady = async () => {
    console.log("handleReady: Received ready signal. Initiating offer...");
    setConnectionState("connecting");
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn("handleReady: peerConnection is null, cannot create offer.");
      return;
    }

     console.log(
       "handleReady: Current signalingState before createOffer:",
       pc.signalingState // Expected: stable
     );

     // Only create offer if connection is stable
     if (pc.signalingState !== "stable") {
        console.warn(`handleReady: Cannot create offer in state ${pc.signalingState}. Aborting.`);
        return;
     }

    try {
      console.log("handleReady: Creating offer...");
      const offer = await pc.createOffer();
      console.log("handleReady: Created offer.");

      console.log(
        "handleReady: Current signalingState before setLocalDescription (offer):",
        pc.signalingState // Expected: stable
      );

      // State must be stable before setting local offer
      if (pc.signalingState !== "stable") {
          console.error(`handleReady: State changed unexpectedly to ${pc.signalingState} before setting local offer. Aborting.`);
          return;
      }

      console.log("handleReady: Setting local description (offer)...");
      await pc.setLocalDescription(offer);
      console.log(
        "handleReady: Set local description success. New signalingState:",
        pc.signalingState // Expected: have-local-offer
      );

      console.log("handleReady: Emitting offer to server...");
      socket.emit("offer", { offer, room });
      console.log("handleReady: Emitted offer.");

    } catch (error) {
      console.error("handleReady: Error creating or setting offer:", error);
      if (pc) {
         console.error("handleReady: Signaling state at time of error:", pc.signalingState);
       }
      setConnectionState("error");
    }
  };

    // Handles the 'leave-room' signal or disconnection
    const handleLeaveRoom = () => {
      console.log("handleLeaveRoom: Received leave-room signal or peer disconnected.");
      cleanupConnection();
      setInRoom(false);
      setConnectionState("disconnected");
      // Optionally, reset refs or state related to the remote peer
       if (remoteVideoRef.current) {
         remoteVideoRef.current.srcObject = null;
       }
    };

  // --- Connection Setup and Teardown ---

  // Sets up the local media stream and initializes the peer connection
  const setupStream = async () => {
    console.log("setupStream: Attempting to get user media...");
    setConnectionState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          // Modern constraints - browser might ignore unsupported ones
          noiseSuppression: true,
          echoCancellation: true,
          // autoGainControl: true, // Use with caution, can sometimes amplify noise
        },
      });
      console.log("setupStream: Media stream acquired.");

      if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
      } else {
          console.warn("setupStream: localVideoRef is null when stream acquired.");
      }
      localStreamRef.current = stream;

      console.log("setupStream: Creating RTCPeerConnection...");
      initializePeerConnection(stream); // Separate function for clarity

      // If room is specified, join the room via socket
      if (room) {
        console.log(`setupStream: Joining room ${room}...`);
        socket.emit("join-room", { room });
        setInRoom(true);

        // Setup socket listeners only after joining the room
        setupSocketListeners();
      } else {
         console.warn("setupStream: No room specified.");
         setConnectionState("disconnected"); // Or some other appropriate state
      }

    } catch (error) {
      console.error("setupStream: Error accessing media devices:", error);
      if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setMediaError("Media devices (camera/microphone) not found.");
      } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setMediaError("Permission denied for camera/microphone.");
      } else {
        setMediaError(`Error accessing media devices: ${error.message}`);
      }
      setConnectionState("error");
    }
  };

  // Initializes the RTCPeerConnection object and its event handlers
  const initializePeerConnection = (stream) => {
    // Ensure previous connection is closed before creating a new one
    if (peerConnectionRef.current) {
        console.warn("initializePeerConnection: Closing existing PeerConnection before creating new one.");
        peerConnectionRef.current.close();
    }
    pendingIceCandidates.current = []; // Clear pending candidates for the new connection


    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;
    console.log("initializePeerConnection: RTCPeerConnection created.");

    // Add local media tracks to the connection
    stream
      .getTracks()
      .forEach((track) => {
          console.log(`initializePeerConnection: Adding track ${track.kind}`);
          pc.addTrack(track, stream);
      });

    // Handle incoming tracks from the remote peer
    pc.ontrack = (event) => {
      console.log(`initializePeerConnection: ontrack event - Received remote ${event.track.kind} track.`);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        console.log("initializePeerConnection: Assigning stream to remote video element.");
        remoteVideoRef.current.srcObject = event.streams[0];
      } else {
         console.warn("initializePeerConnection: remoteVideoRef or event streams not available for ontrack.");
         if(!remoteVideoRef.current) console.warn("--> remoteVideoRef.current is null");
         if(!event.streams || !event.streams[0]) console.warn("--> event.streams[0] is null or undefined");
      }
    };

    // Handle ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("initializePeerConnection: onicecandidate - Generated ICE candidate:", event.candidate.type, event.candidate.sdpMLineIndex);
        socket.emit("ice-candidate", { candidate: event.candidate, room });
      } else {
         console.log("initializePeerConnection: onicecandidate - End of candidates.");
         // End of candidates
      }
    };

    // Handle connection state changes (more reliable than signalingState for connection status)
     pc.onconnectionstatechange = () => {
       const newState = pc.connectionState;
       console.log(`initializePeerConnection: onconnectionstatechange - State changed to: ${newState}`);
       // Update our custom connection state based on the WebRTC state
       switch (newState) {
         case "new":
         case "checking":
           setConnectionState("connecting");
           break;
         case "connected":
           setConnectionState("connected");
           break;
         case "disconnected": // May reconnect
           setConnectionState("disconnected");
           // Consider adding a check/timer for "failed" if it stays disconnected
           break;
         case "closed":
           setConnectionState("disconnected"); // Or "closed" if you need that distinction
           break;
         case "failed":
           setConnectionState("failed");
           handleLeaveRoom(); // Treat failure as leaving
           break;
         default:
           console.log(`Unhandled connection state: ${newState}`);
           break;
       }
     };

     // Optional: Monitor signaling state changes for debugging
     pc.onsignalingstatechange = () => {
        console.log(`initializePeerConnection: onsignalingstatechange - State changed to: ${pc.signalingState}`);
     };

     // Optional: Handle ICE gathering state changes
     pc.onicegatheringstatechange = () => {
         console.log(`initializePeerConnection: onicegatheringstatechange - State changed to: ${pc.iceGatheringState}`);
     };

     // Optional: Handle ICE connection state changes (older API, prefer onconnectionstatechange)
     // pc.oniceconnectionstatechange = () => {
     //    console.log(`initializePeerConnection: oniceconnectionstatechange - State changed to: ${pc.iceConnectionState}`);
     // };
  };

  // Sets up the socket event listeners for WebRTC signaling
  const setupSocketListeners = () => {
    console.log("setupSocketListeners: Setting up listeners for offer, answer, ice-candidate, ready, leave-room");
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer); // Use the correct handler
    socket.on("ice-candidate", handleIceCandidate); // Use the correct handler
    socket.on("ready", handleReady); // Use the correct handler
    socket.on("leave-room", handleLeaveRoom); // Use the correct handler
    // Listen for explicit disconnect from server or peer
    socket.on("user-disconnected", (data) => { // Assuming server sends this
        console.log(`User ${data.socketId} disconnected.`);
        // If this means the *other* user left the room
        handleLeaveRoom();
    });
  };

  // Removes socket event listeners
  const cleanupSocketListeners = () => {
     if (socket) {
        console.log("cleanupSocketListeners: Removing listeners...");
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("ready", handleReady);
        socket.off("leave-room", handleLeaveRoom);
        socket.off("user-disconnected");
     }
  };

  // Cleans up the PeerConnection and local media stream
  const cleanupConnection = () => {
      console.log("cleanupConnection: Cleaning up WebRTC connection and media stream...");
      // Close PeerConnection
      if (peerConnectionRef.current) {
        console.log("cleanupConnection: Closing PeerConnection.");
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      } else {
          console.log("cleanupConnection: PeerConnection already null.");
      }

      // Stop MediaStream tracks
      if (localStreamRef.current) {
        console.log("cleanupConnection: Stopping media stream tracks.");
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      } else {
          console.log("cleanupConnection: Local media stream already null.");
      }

      // Clear video elements
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      // Reset state variables
      pendingIceCandidates.current = [];
      // Keep mediaError if it occurred during setup? Maybe clear it?
      // setMediaError(null);
      // Reset toggles? Depends on desired UX upon reconnecting/new call
      // setIsAudioMuted(false);
      // setIsMicMuted(false);
      // setIsCameraOff(false);
  };

  // --- Effect Hook for Setup and Cleanup ---

  useEffect(() => {
    if (!socket || !room) {
       console.log("useEffect: Socket or room not available yet.");
       // If there's an existing connection, clean it up if socket/room disappears
        if (inRoom || peerConnectionRef.current) {
            console.log("useEffect: Cleaning up due to missing socket or room.");
            endCall(); // Use endCall to notify server if possible
        }
       return;
    }

    console.log("useEffect: Socket and room available. Setting up stream...");
    // Reset state before setup for fresh connection attempt
    setConnectionState("disconnected");
    setMediaError(null);
    setInRoom(false); // Will be set true in setupStream if join is successful

    setupStream(); // Initiates media access and peer connection setup

    // Return cleanup function
    return () => {
      console.log("useEffect cleanup: Component unmounting or dependencies changed.");
      if (socket && room && inRoom) { // Only emit leave if we were actually in a room
          console.log("useEffect cleanup: Emitting leave-room.");
          socket.emit("leave-room", { room });
      }
      cleanupConnection();
      cleanupSocketListeners();
      setInRoom(false); // Ensure inRoom is false on cleanup
      setConnectionState("disconnected"); // Ensure state is reset
    };
    // Dependencies: The hook should re-run if the socket instance or the room changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, room]); // `inRoom` should not be a dependency here

  // --- User Actions ---

  // Ends the call and cleans up resources
  const endCall = () => {
    console.log("endCall: User initiated call end.");
    setConnectionState("disconnecting");
    if (socket && room) { // Check if socket and room exist before emitting
      console.log("endCall: Emitting leave-room to server.");
      socket.emit("leave-room", { room });
    } else {
        console.warn("endCall: Socket or room not available, cannot emit leave-room.");
    }
    cleanupConnection();
    cleanupSocketListeners(); // Ensure listeners are removed here too
    setInRoom(false);
    setConnectionState("disconnected");

    // Reset UI state
    setIsCameraOff(false);
    setIsMicMuted(false);
    setIsAudioMuted(false);
  };

  // Toggles remote audio output mute
  const toggleAudio = () => {
     // This usually controls the <video> element's muted property
     console.log("toggleAudio: Toggling remote audio mute state.");
     setIsAudioMuted((prev) => !prev);
     if(remoteVideoRef.current){
        remoteVideoRef.current.muted = !isAudioMuted; // Apply the *new* state
     }
  };

  // Toggles local camera track enabled state
  const toggleCamera = () => {
    console.log("toggleCamera: Toggling local camera.");
    const videoTrack = localStreamRef.current
      ?.getVideoTracks()
      .find((track) => track.kind === "video"); // More robust track finding

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled); // Update state based on the new track state
      console.log(`toggleCamera: Camera track enabled: ${videoTrack.enabled}`);
    } else {
        console.warn("toggleCamera: Video track not found.");
    }
  };

  // Toggles local microphone track enabled state
  const toggleMic = () => {
    console.log("toggleMic: Toggling local microphone.");
     const audioTrack = localStreamRef.current
       ?.getAudioTracks()
       .find((track) => track.kind === "audio");

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled); // Update state based on the new track state
      console.log(`toggleMic: Mic track enabled: ${audioTrack.enabled}`);
    } else {
        console.warn("toggleMic: Audio track not found.");
    }
  };

  // --- Return Values ---

  return {
    localVideoRef,
    remoteVideoRef,
    isAudioMuted, // State for muting remote audio output
    isMicMuted,   // State for muting local mic input
    isCameraOff,  // State for turning off local camera input
    inRoom,       // Is the user currently in a signaling room?
    mediaError,   // Any error during media setup
    connectionState, // Detailed connection status
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  };
};

export default useVideoChat;