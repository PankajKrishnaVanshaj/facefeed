import { useEffect, useState, useContext } from "react";
import { SocketContext } from "../hooks/SocketProvider";
import TextChat from "../components/TextChat";
import VideoChat from "../components/VideoChat";
import AdsSection from "../components/AdsSection";

const RandomVideoChat = () => {
  const [roomId, setRoomId] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionsError, setPermissionsError] = useState(null);
  const socket = useContext(SocketContext);

  // Check for camera and microphone permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPermissionsGranted(true);
      } catch (error) {
        console.error("Permission denied for camera and microphone:", error);
        setPermissionsError(
          "Unable to access camera or microphone. Please grant permissions."
        );
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    if (socket && permissionsGranted) {
      const handleSendOffer = ({ roomId }) => {
        setRoomId(roomId); // Save the roomId received from the event
      };

      socket.on("send-offer", handleSendOffer);

      // Clean up the event listener on component unmount
      return () => {
        socket.off("send-offer", handleSendOffer);
      };
    }
  }, [socket, permissionsGranted]);

  return (
    <div className="h-screen px-1.5 gap-x-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg shadow-lg p-6 hidden lg:block">
        <AdsSection />
      </div>
      <div className="rounded-lg shadow-lg text-white">
        {permissionsError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium text-red-600">
              {permissionsError}
            </p>
          </div>
        ) : roomId ? (
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
        {permissionsError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg font-medium text-red-600">
              {permissionsError}
            </p>
          </div>
        ) : roomId ? (
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
