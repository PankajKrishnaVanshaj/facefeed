import { useEffect, useState, useContext } from "react";
import { SocketContext } from "../hooks/SocketProvider";
import TextChat from "../components/TextChat";
import VideoChat from "../components/VideoChat";
import GameSection from "../components/GameSection";

const RandomVideoChat = () => {
  const [roomId, setRoomId] = useState(null);
  const socket = useContext(SocketContext);

  // Ensuring socket interaction only after permissions are granted
  useEffect(() => {
    if (socket) {
      const handleSendOffer = ({ roomId }) => {
        setRoomId(roomId); // Save the roomId received from the event
      };

      // Attach socket event listener for 'send-offer' event
      socket.on("send-offer", handleSendOffer);

      // Cleanup on component unmount or permissions change
      return () => {
        socket.off("send-offer", handleSendOffer);
      };
    }
  }, [socket]); // Ensure effect runs only after permissions are granted


  if (!roomId) {
    return (
      <div className="h-[88vh]">
        <div className="flex items-center justify-center h-full">
          <p className="text-2xl font-medium bg-primary-gradient text-transparent bg-clip-text animate-pulse">
            Waiting for connection...{" "}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen gap-x-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 bg-white">
      <div className="rounded-lg shadow-lg hidden lg:block">
        <TextChat room={roomId} />
      </div>
      <div className="rounded-lg shadow-lg">
        <VideoChat room={roomId} />
      </div>
      <div className="rounded-lg shadow-lg hidden md:block">
        <GameSection room={roomId}/>
      </div>
    </div>
  );
};

export default RandomVideoChat;