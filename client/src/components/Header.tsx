import React from "react";
import { Link } from "react-router-dom";
import MeInfo from "./MeInfo";

function Header() {
  const token = localStorage.getItem("authToken");

  return (
    <div className="bg-lightGray shadow-md rounded-full mx-3 my-1 hover:shadow-sm hover:shadow-primary">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center px-4 sm:px-6 lg:px-8 justify-between">
        <div className="flex items-center">
          <Link to={"/"}>
            <img
              src="/facefeed.png"
              alt="logo"
              width={55}
              height={55}
              className="mt-1 hover:scale-90 cursor-pointer invert"
            />
          </Link>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold bg-primary-gradient text-transparent bg-clip-text ml-6">
            <Link to={"/"}>PK Facefeed</Link>
          </h1>
        </div>

        <div className="flex items-center justify-center h-screen">
          {token ? (
            <MeInfo />
          ) : (
            <div className="text-lg sm:text-xl md:text-2xl bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text font-semibold tracking-wide px-4 py-1.5 rounded-lg cursor-pointer hover:scale-110 transition-transform duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2">
              Log In
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
