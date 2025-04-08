import React, { createContext, useContext, useEffect, useState, useCallback } from "react"; // Added useCallback
import io from "socket.io-client";
import { useLocation } from "react-router-dom";

export const SocketContext = createContext(null); // Initialize with null

export const useSocket = () => {
  const context = useContext(SocketContext);
  // No need to throw error here, components using the hook should handle null socket if necessary
  // if (!context) {
  //   throw new Error("useSocket must be used within a SocketProvider");
  // }
  return context;
};

// Function to check permissions (can be outside the component)
const checkPermissions = async () => {
  console.log("Checking media permissions...");
  try {
    // Requesting both is important for video chat
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    // Important: Stop the tracks immediately after permission check
    stream.getTracks().forEach(track => track.stop());
    console.log("Media permissions granted.");
    return true; // Permissions granted
  } catch (error) {
    console.error("Permission request failed:", error.name, error.message);
    // Provide more specific feedback if possible
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        alert("Camera and microphone access denied. Please allow access in your browser settings to use video chat.");
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        alert("No camera or microphone found. Please ensure they are connected and enabled.");
    } else {
        alert(`An error occurred while accessing media devices: ${error.name}`);
    }
    return false; // Permissions denied or error occurred
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  // Confirmation state might be better handled closer to where the action is initiated (e.g., clicking the "Start Chat" button)
  // But keeping it here for now as per your original code.
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false); // Prevent multiple checks
  const location = useLocation();
  const isVideoChatPath = location.pathname === "/random-video-chat"; // Specific path check

  // Function to prompt user for confirmation (using useCallback)
  const handleConfirmation = useCallback(() => {
    // Only ask if on the correct path and not already confirmed
    if (isVideoChatPath && !isConfirmed) {
        console.log("Requesting user confirmation for random chat...");
        // Slight rephrase for clarity
        const userConfirmed = window.confirm(
          "You are about to start a random video chat. You may be connected with someone you don't know. Do you want to proceed?"
        );
        if (userConfirmed) {
          console.log("User confirmed.");
          setIsConfirmed(true); // User confirmed, allow permission check/socket init
        } else {
          console.log("User declined confirmation.");
          // Optional: Redirect user away or disable the feature
          // navigate('/'); // Example using useNavigate() from react-router-dom
          alert("Random video chat cancelled.");
        }
    }
  }, [isVideoChatPath, isConfirmed]); // Dependencies for useCallback


  // Effect for Initialization: Confirmation -> Permissions -> Socket
  useEffect(() => {
    // Guard: Only run if on the video chat path
    if (!isVideoChatPath) {
        // If navigating away, ensure cleanup
        if (socket) {
            console.log("SocketProvider: Navigated away from video chat path, disconnecting socket.");
            socket.disconnect();
            setSocket(null);
            setIsConfirmed(false); // Reset confirmation if user leaves the page
        }
        return; // Stop execution if not on the relevant path
    }

    // Step 1: Check Confirmation (Trigger if needed)
    if (!isConfirmed) {
        console.log("SocketProvider: User confirmation pending.");
        handleConfirmation(); // Ask for confirmation
        return; // Wait for confirmation state change
    }

    // Step 2: Check Permissions (Only if confirmed and not already checking/connected)
    if (isConfirmed && !socket && !isCheckingPermissions) {
      const initialize = async () => {
          setIsCheckingPermissions(true);
          console.log("SocketProvider: User confirmed, checking permissions...");
          const hasPermission = await checkPermissions();

          if (hasPermission) {
            console.log("SocketProvider: Permissions granted, initializing socket...");
            // Ensure environment variable is loaded
            const apiUrl = import.meta.env.VITE_API_URL;
            if (!apiUrl) {
                console.error("SocketProvider: VITE_API_URL environment variable is not set!");
                alert("Configuration error: Server address not found.");
                 setIsCheckingPermissions(false);
                return;
            }

            const newSocket = io(apiUrl, {
              withCredentials: true,
              // Optional: Consider adding reconnection attempts config
              // reconnectionAttempts: 5,
              // reconnectionDelay: 1000,
            });

            newSocket.on('connect', () => {
                console.log(`SocketProvider: Socket connected with ID: ${newSocket.id}`);
                setSocket(newSocket);
            });

            newSocket.on('disconnect', (reason) => {
                console.log(`SocketProvider: Socket disconnected. Reason: ${reason}`);
                setSocket(null);
                // Optionally reset confirmation if disconnect is unexpected
                // setIsConfirmed(false);
            });

            newSocket.on('connect_error', (error) => {
                console.error(`SocketProvider: Socket connection error: ${error.message}`);
                // Optionally show error to user
                alert(`Failed to connect to the chat server: ${error.message}`);
                setSocket(null); // Ensure socket state is cleared on error
            });

          } else {
             console.log("SocketProvider: Permissions denied or failed, socket not initialized.");
             // Optionally reset confirmation state if permissions are permanently denied
             // setIsConfirmed(false);
          }
          setIsCheckingPermissions(false); // Finished checking
      };
      initialize();
    }

    // Cleanup function for when the component unmounts or path/confirmation changes triggering re-run
    return () => {
        // This cleanup runs *before* the effect runs again OR when the component unmounts.
        console.log("SocketProvider: Effect cleanup running...");
        // Check if path changed *away* from video chat path OR if confirmation was reset
         if (!isVideoChatPath || !isConfirmed) {
             if (socket) {
                 console.log("SocketProvider Cleanup: Disconnecting socket due to path change or lost confirmation.");
                 socket.disconnect();
                 setSocket(null);
             }
              // Reset state if leaving the path
             if (!isVideoChatPath) setIsConfirmed(false);
         }
         // No else needed: if path and confirmation are still valid, the socket should persist until explicitly disconnected above or on unmount
    };
    // Re-run when location path or confirmation status changes
  }, [location.pathname, isConfirmed, isVideoChatPath, socket, isCheckingPermissions, handleConfirmation]);


  return (
    <SocketContext.Provider value={socket}>
        {children}
    </SocketContext.Provider>
  );
};