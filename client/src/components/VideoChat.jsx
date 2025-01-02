import VideoStream from "./VideoStream";
import MediaControls from "./MediaControls";
import useVideoChat from "../hooks/useVideoChat";
import WaterMark from "./WaterMark";

const VideoChat = ({ room }) => {
  const {
    localVideoRef,
    remoteVideoRef,
    isAudioMuted,
    isMicMuted,
    isCameraOff,
    mediaError,
    connectionStatus,
    endCall,
    toggleAudio,
    toggleMic,
    toggleCamera,
  } = useVideoChat(room);

  if (mediaError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 text-lg">
          Error accessing media devices: {mediaError}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary-gradient text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full py-1">
      <WaterMark />
      {/* <div className="absolute justify-center left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-1 p-1">
        {connectionStatus}
      </div> */}
      <VideoStream
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        isAudioMuted={isAudioMuted}
        isCameraOff={isCameraOff}
      />
      <MediaControls
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        toggleAudio={toggleAudio}
        endCall={endCall}
        isAudioMuted={isAudioMuted}
        isMicMuted={isMicMuted}
        isCameraOff={isCameraOff}
      />
    </div>
  );
};

export default VideoChat;
