import { useEffect, useState, useContext } from "react";
import { SocketContext } from "../hooks/SocketProvider";
import TextChat from "../components/TextChat";
import VideoChat from "../components/VideoChat";
import AdsSection from "../components/AdsSection";

const RandomVideoChat = () => {
  const [roomId, setRoomId] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const socket = useContext(SocketContext);

  // Function to check permissions immediately on page visit
  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Check if both video and audio tracks are available
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack && audioTrack) {
        setPermissionsGranted(true); // Both video and audio permissions granted
      } else {
        throw new Error("Either video or audio permission denied");
      }
    } catch (error) {
      console.error("Permission request failed:", error);
      setPermissionsGranted(false); // Permissions denied
    }
  };

  useEffect(() => {
    checkPermissions(); // Check permissions on component mount
  }, []);

  // Ensuring socket interaction only after permissions are granted
  useEffect(() => {
    if (permissionsGranted && socket) {
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
  }, [permissionsGranted, socket]); // Ensure effect runs only after permissions are granted

  // Handle case when no roomId is received within a timeout
  // useEffect(() => {
  //   if (!roomId) {
  //     const timer = setTimeout(() => {
  //       console.warn(
  //         "No roomId received within 14 seconds, refreshing the page..."
  //       );
  //       window.location.reload(); // Refresh the page
  //     }, 14000);

  //     // Clear the timeout if roomId is set within 14 seconds
  //     return () => clearTimeout(timer);
  //   }
  // }, [roomId]);

  if (!permissionsGranted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs md:max-w-md lg:max-w-lg text-center mx-4">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Permissions Request</h2>
          <p className="mb-6 text-sm md:text-base">
            Please Allow camera and microphone permissions to proceed.
          </p>
  
          <div className="flex justify-center">
            <button
              onClick={checkPermissions}
              className="px-4 py-2 text-sm md:text-lg font-medium bg-primary-gradient text-white rounded-md shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-200"
            >
              Allow Camera & Microphone
            </button>
          </div>
        </div>
      </div>
    );
  }
  

  if (!roomId) {
    return (
      <div className="h-[90vh]">
        <div className="flex items-center justify-center h-full">
          <p className="text-2xl font-medium bg-primary-gradient text-transparent bg-clip-text animate-pulse">
            Waiting for connection...{" "}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen px-1.5 gap-x-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg shadow-lg p-6 hidden lg:block">
        <AdsSection />
      </div>
      <div className="rounded-lg shadow-lg text-white">
        <VideoChat room={roomId} />
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6 hidden md:block">
        <div className="h-full flex flex-col">
          <TextChat room={roomId} />
        </div>
      </div>
    </div>
  );
};

export default RandomVideoChat;
