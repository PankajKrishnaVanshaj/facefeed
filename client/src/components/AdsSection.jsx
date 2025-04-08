const AdsSection = () => {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-xl mx-auto mt-10 border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 text-center mb-4">
        Important Information
      </h2>
      <p className="text-base text-gray-700 leading-relaxed">
        By using our app or platform, you confirm that you are either
        <span className="bg-primary-gradient text-transparent bg-clip-text font-bold">
          {" "}
          18 years or older
        </span>
        , or
        <span className="bg-primary-gradient text-transparent bg-clip-text font-bold">
          {" "}
          at least 13 years old with parental consent
        </span>
        .
      </p>
      <hr className="my-6 border-gray-300" />
      <p className="text-base text-gray-700 leading-relaxed">
        {/* All video interactions are monitored. */}
        Please conduct yourself
        <span className="bg-primary-gradient text-transparent bg-clip-text font-bold">
          {" "}
          with respect and responsibility
        </span>{" "}
        at all times.
      </p>
    </div>
  );
};

export default AdsSection;
