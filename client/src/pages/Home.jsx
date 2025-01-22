import { Link } from "react-router-dom";

function Home() {
  return (
    <section className="">
      <div className="flex items-baseline justify-center pt-20">
        <h2 className="bg-primary-gradient text-transparent bg-clip-text font-extrabold border px-4 py-2 rounded-full text-center border-gray-200 text-lg md:text-xl lg:text-2xl">
          PK Facefeed |{" "}
          <span className="text-gray-500 font-mono">Meet Random Friends</span>
        </h2>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-12 lg:flex lg:justify-center">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-2xl bg-primary-gradient text-transparent bg-clip-text font-extrabold sm:text-3xl md:text-4xl lg:text-5xl">
            PK Facefeed
          </h1>

          <p className="mt-4 text-slate-400 text-sm sm:text-base md:text-lg lg:text-xl">
            Discover the vibrant community of PK Facefeed, your premier
            destination for meeting new people online. Experience the thrill of
            initiating video conversations with strangers from around the globe,
            all at the touch of a button. With PK Facefeed&#39;s intuitive
            mobile app, connecting with others is easier than ever before no
            registration required. Embrace the excitement of spontaneous
            interactions and download PK Facefeed now to start chatting
            instantly.
          </p>

          <div className="flex items-baseline justify-center pt-10">
            <h2 className="bg-primary-gradient text-transparent bg-clip-text font-extrabold border px-4 py-2 text-lg rounded-full text-center border-gray-400 md:text-xl lg:text-2xl">
              <span className="px-4">
                <Link to={"/random-video-chat"}>Video Chat || Text Chat</Link>
              </span>
            </h2>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              className="block w-full rounded-2xl bg-lightGray text-black px-8 py-3 text-lg font-semibold shadow-2xl hover:bg-secondary focus:outline-none focus:ring active:bg-orange-500 sm:w-auto"
              to="/#"
            >
              Download PK Facefeed App
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="bg-primary-gradient text-transparent bg-clip-text font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
            Explore Boundless Connections: PK Facefeed&#39;s Premier Random
            Video Chat Platform
          </h1>

          <p className="mt-4 text-slate-400 text-sm sm:text-base md:text-lg lg:text-xl">
            For an exhilarating online random conversation experience at no
            cost, PK Facefeed is your ultimate destination. PK Facefeed chat
            offers seamless video interactions with strangers, opening doors to
            endless possibilities of making new friends across the globe.
            Whether you&#39;re chatting from your PC, smartphone, or tablet, PK
            Facefeed&#39;s versatile platform ensures accessibility for all.
            With minimal waiting times, a mere click is all it takes to connect
            with your preferred stranger. PK Facefeed&#39;s user-friendly
            interface fosters connections with like-minded individuals, making
            every interaction meaningful. The platform&#39;s vibrant personality
            shines through, providing an amazing video chatting experience
            that&#39;s unmatched. Best of all, PK Facefeed is completely free to
            use – simply hop on as a guest and dive into conversations with
            random people. With Facefeed.pankri.com now available, finding your
            virtual date has never been easier, with no additional charges or
            plugins required. Join PK Facefeed today and elevate your chatting
            experience to new heights!
          </p>
        </div>

        <div className="mx-auto max-w-6xl mt-9">
          <h1 className="bg-primary-gradient text-transparent bg-clip-text font-extrabold text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
            While using PK Facefeed, you agree to the following Terms
          </h1>

          <p className="mt-4 text-slate-400 text-sm sm:text-base md:text-lg lg:text-xl">
            By installing our app or accessing our web platform, you acknowledge
            that you are 18+ or 13+ with parental permission. <br /> <br />
            All video conversations are moderated, so please conduct yourself
            respectfully and responsibly. <br /> <br /> PK Facefeed may utilize
            your college email address for identity verification purposes for
            student accounts. Rest assured, PK Facefeed will not spam you, sell
            your information, or store any personal data. <br /> <br />
            We advise users under 18 to refrain from accessing the unmoderated
            section. Please note that users in this section are solely
            responsible for their behavior, as PK Facefeed does not moderate
            this section.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Home;
