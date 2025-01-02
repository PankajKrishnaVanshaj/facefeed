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

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const location = useLocation(); // get the current location

  useEffect(() => {
    // Disconnect the existing socket before making a new connection
    if (socket) {
      socket.disconnect();
      setSocket(null); // Clear the previous socket state
    }

    if (location.pathname === "/random-video-chat") {
      const newSocket = io(import.meta.env.VITE_API_URL);
      setSocket(newSocket);

      // Cleanup on component unmount or path change
      return () => {
        if (newSocket) newSocket.disconnect();
      };
    }
  }, [location.pathname]); // Re-run the effect whenever the pathname changes

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
