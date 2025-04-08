import { FiPhoneForwarded } from "react-icons/fi";
import { BsMicMute, BsMic } from "react-icons/bs";
import { GoMute, GoUnmute } from "react-icons/go";
import { BiCamera, BiCameraOff } from "react-icons/bi";
import { GiPlayerNext } from "react-icons/gi";

const MediaControls = ({
  toggleMic,
  toggleCamera,
  toggleAudio,
  endCall,
  isAudioMuted,
  isMicMuted,
  isCameraOff,
}) => {
  const leave = () => {
    if (window.history.length > 1) {
      window.history.go(-1);
    } else {
      window.location.href = "/"; // Fallback to the root page
    }
  };

  return (
    <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-1 p-1">
      <span
        onClick={leave}
        className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full cursor-pointer hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition ease-in-out duration-150"
      >
        <FiPhoneForwarded className="w-6 h-6 text-white" />
      </span>
      <span
        onClick={toggleCamera}
        className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
      >
        {isCameraOff ? (
          <BiCameraOff className="w-6 h-6 text-secondary" />
        ) : (
          <BiCamera className="w-6 h-6 text-primary" />
        )}
      </span>

      <span
        onClick={toggleMic}
        className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
      >
        {isMicMuted ? (
          <BsMicMute className="w-6 h-6 text-secondary" />
        ) : (
          <BsMic className="w-6 h-6 text-primary" />
        )}
      </span>

      <span
        onClick={toggleAudio}
        className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 transition ease-in-out duration-150"
      >
        {isAudioMuted ? (
          <GoMute className="w-6 h-6 text-secondary" />
        ) : (
          <GoUnmute className="w-6 h-6 text-primary" />
        )}
      </span>
      <span
        onClick={endCall}
        className="flex items-center justify-center w-10 h-10 bg-red-500 rounded-full cursor-pointer hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition ease-in-out duration-150"
      >
        <GiPlayerNext className="w-6 h-6 text-white" />
      </span>
    </div>
  );
};

export default MediaControls;
