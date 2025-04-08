const WaterMark = () => {
  return (
    <div className="absolute top-[-7px] left-7 transform -translate-x-1/2 z-10 flex flex-col items-center justify-center p-3 rotate-[-45deg]">
      {/* Logo */}
      <div>
        <img
          src="/facefeed.png"
          alt="WaterMark"
          width={42}
          height={42}
          className="mt-0.5 hover:scale-110 cursor-pointer invert"
        />
      </div>
      {/* Text */}
      <div className="text-sm font-extrabold bg-primary-gradient text-transparent bg-clip-text mt-[-11px]">
        PK Facefeed
      </div>
    </div>
  );
};

export default WaterMark;
