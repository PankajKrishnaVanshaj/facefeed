const VideoStream = ({ localVideoRef, remoteVideoRef, isAudioMuted }) => {

  
  return (
    <div className="flex flex-col h-full space-y-0.5 flex-shrink-0">
      {/* Remote Video */}
      <div className="flex-1 flex items-center justify-center border-2 border-transparent rounded-md overflow-hidden shadow-md bg-primary-gradient bg-clip-border">
        <video
          ref={remoteVideoRef}
          autoPlay
          muted={isAudioMuted}
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirroring the remote video
        />
      </div>

      {/* Local Video */}
      <div className="relative h-1/2 border-2 border-transparent rounded-md overflow-hidden shadow-md bg-primary-gradient bg-clip-border">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirroring the local video
        />
      </div>
    </div>
  );
};

export default VideoStream;
