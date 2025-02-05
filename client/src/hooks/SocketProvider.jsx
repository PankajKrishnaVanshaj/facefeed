import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useLocation } from "react-router-dom"; // import useLocation from react-router-dom

export const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Function to check permissions
const checkPermissions = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    return true; // Permissions granted
  } catch (error) {
    console.error("Permission request failed:", error);
    return false; // Permissions denied
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false); // State for user confirmation
  const location = useLocation(); // get the current location

  useEffect(() => {
    const initializeSocket = async () => {
      const hasPermission = await checkPermissions(); // Check permissions before proceeding

      if (hasPermission && location.pathname === "/random-video-chat") {
        // Only proceed if permissions are granted and user has confirmed
        if (isConfirmed) {
          const newSocket = io(import.meta.env.VITE_API_URL, {
            withCredentials: true,
          });
          setSocket(newSocket);

          // Cleanup on component unmount or path change
          return () => {
            if (newSocket) newSocket.disconnect();
          };
        }
      }
    };

    // Only initialize the socket if permissions are granted and the user confirmed
    initializeSocket();
  }, [location.pathname, isConfirmed]); // Re-run when location or confirmation changes

  // Function to prompt user for confirmation
  const handleConfirmation = () => {
    const userConfirmed = window.confirm(
      "Are you sure you want to call a random person? You may be connected with someone you don't know."
    );
    if (userConfirmed) {
      setIsConfirmed(true); // User confirmed, proceed with socket initialization
    }
  };

  useEffect(() => {
    // Trigger confirmation when the component is mounted or pathname changes
    if (location.pathname === "/random-video-chat" && !isConfirmed) {
      handleConfirmation();
    }
  }, [location.pathname, isConfirmed]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};