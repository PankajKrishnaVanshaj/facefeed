const VideoStream = ({ localVideoRef, remoteVideoRef, isAudioMuted }) => {
  return (
    <div className="flex flex-col h-[98vh] space-y-0.5 flex-shrink-0">
      {/* Remote Video */}
      <div className="flex-1 flex items-center justify-center border-2 border-transparent rounded-xl overflow-hidden shadow-md bg-primary-gradient bg-clip-border">
        <video
          ref={remoteVideoRef}
          autoPlay
          muted={isAudioMuted}
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
          style={{
            backgroundImage: 'url("/loading.gif")',
            backgroundRepeat: "no-repeat", // Ensures the image repeats
            backgroundSize: "auto", // Keeps the original size of the image
            backgroundPosition: "center", // Centers the background
            backgroundColor: "black",
          }}
        />
      </div>

      {/* Local Video */}
      <div className="flex-1 flex items-center justify-center border-2 border-transparent rounded-xl overflow-hidden shadow-md bg-primary-gradient bg-clip-border">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform scale-x-[-1]"
          style={{
            backgroundImage: 'url("/loading.gif")',
            backgroundRepeat: "no-repeat", // Ensures the image repeats
            backgroundSize: "auto", // Keeps the original size of the image
            backgroundPosition: "center", // Centers the background
            backgroundColor: "black",
          }}
        />
      </div>
    </div>
  );
};

export default VideoStream;
