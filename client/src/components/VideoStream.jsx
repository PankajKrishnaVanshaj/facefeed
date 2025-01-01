const VideoStream = ({ localVideoRef, remoteVideoRef, isAudioMuted }) => {
  return (
    <div className="flex flex-col h-full space-y-0.5 flex-shrink-0">
      {/* Remote Video */}
      <div className="flex-1 flex items-center justify-center border-2 border-transparent rounded-md overflow-hidden shadow-md bg-primary-gradient bg-clip-border md:h-auto h-[60vh]">
        <video
          ref={remoteVideoRef}
          autoPlay
          muted={isAudioMuted}
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      </div>

      {/* Local Video */}
      <div className="relative md:h-1/2 h-[30vh] mt-2 border-2 border-transparent rounded-md overflow-hidden shadow-md bg-primary-gradient bg-clip-border">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
      </div>
    </div>
  );
};

export default VideoStream;
