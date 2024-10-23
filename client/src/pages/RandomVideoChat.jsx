// RandomVideoChat.jsx
import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { SocketContext } from "../components/SocketProvider";
import TextChat from "../components/TextChat";
import VideoChat from "../components/VideoChat";
import AdsSection from "../components/AdsSection";

const RandomVideoChat = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomId, setRoomId] = useState(null); // Added roomId state
  const token = localStorage.getItem("authToken");
  const socket = useContext(SocketContext);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (token) {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/v1/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setUser(response.data);
        } else {
          console.log("No token found");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  useEffect(() => {
    if (socket) {
      const handleSendOffer = ({ roomId }) => {
        // console.log("Received send-offer event with roomId:", roomId);
        setRoomId(roomId); // Save the roomId received from the event
        // Handle the offer - WebRTC negotiation or other logic
      };

      socket.on("send-offer", handleSendOffer);

      // Clean up the event listener on component unmount
      return () => {
        socket.off("send-offer", handleSendOffer);
      };
    }
  }, [socket]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="h-screen px-2 gap-x-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div className="bg-white rounded-lg shadow-lg p-6 hidden lg:block">
        <span className="text-gray-700 font-semibold text-xl">
          <AdsSection />
        </span>
      </div>
      <div className="rounded-lg shadow-lg text-white">
        <VideoChat room={roomId} />
      </div>
      <div className="bg-white rounded-lg shadow-lg p-6 hidden md:block">
        {user && roomId ? ( // Ensure both user and roomId are available
          <div className="h-full flex flex-col">
            <TextChat room={roomId} />
          </div>
        ) : (
          <div>Waiting for connection...</div> // Fallback content
        )}
      </div>
    </div>
  );
};

export default RandomVideoChat;
