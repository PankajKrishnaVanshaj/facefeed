import { useEffect, useState, useContext } from "react";
import { SocketContext } from "../hooks/SocketProvider";
import TextChat from "../components/TextChat";
import VideoChat from "../components/VideoChat";
import AdsSection from "../components/AdsSection";

const RandomVideoChat = () => {
  const [roomId, setRoomId] = useState(null);
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (socket) {
      const handleSendOffer = ({ roomId }) => {
        setRoomId(roomId); // Save the roomId received from the event
      };

      socket.on("send-offer", handleSendOffer);

      // Clean up the event listener on component unmount
      return () => {
        socket.off("send-offer", handleSendOffer);
      };
    }
  }, [socket]); // This ensures that the effect runs whenever the socket is available

  // Handle case when no roomId is received within a timeout
  useEffect(() => {
    if (!roomId) {
      const timer = setTimeout(() => {
        console.warn(
          "No roomId received within 14 seconds, refreshing the page..."
        );
        window.location.reload(); // Refresh the page
      }, 14000);

      // Clear the timeout if roomId is set within 14 seconds
      return () => clearTimeout(timer);
    }
  }, [roomId]);

  return (
    <div className="h-screen px-1.5 gap-x-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg shadow-lg p-6 hidden lg:block">
        <AdsSection />
      </div>
      <div className="rounded-lg shadow-lg text-white">
        {roomId ? (
          <VideoChat room={roomId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium bg-primary-gradient text-transparent bg-clip-text">
              Connecting to Random user...
            </p>
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6 hidden md:block">
        {roomId ? (
          <div className="h-full flex flex-col">
            <TextChat room={roomId} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium">Waiting for connection...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomVideoChat;
