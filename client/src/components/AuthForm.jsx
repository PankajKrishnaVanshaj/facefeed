import { FcGoogle } from "react-icons/fc";
import { Link } from "react-router-dom";

const AuthForm = () => {
  const googleLogin = () => {
    window.open(`${import.meta.env.VITE_API_URL}/api/v1/auth/google`, "_self");
  };

  return (
    <div className="flex items-center justify-center min-h-screen dark:bg-gray-800">
      <div className="bg-lightGray dark:bg-gray-900 p-6 sm:p-8 md:p-10 lg:p-12 rounded-3xl shadow-xl max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg w-full transform transition-transform duration-300 hover:scale-105">
        <div className="flex justify-center mb-4 sm:mb-6 md:mb-8">
          <Link to={"/"}>
            <img
              src="/facefeed.png"
              alt="Logo"
              className="w-12 sm:w-16 md:w-20 lg:w-24 h-auto duration-300 hover:scale-90 invert"
            />
          </Link>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 md:mb-10 text-center text-gray-900 dark:text-gray-100">
          Sign in with Google
        </h2>
        <button
          onClick={googleLogin}
          className="w-full flex items-center justify-center gap-4 bg-blue-600 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-full shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-300 ease-in-out transform hover:-translate-y-1"
        >
          <FcGoogle className="text-xl sm:text-2xl md:text-3xl" />
          <span className="text-sm sm:text-base md:text-lg font-semibold">
            Sign in with Google
          </span>
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
