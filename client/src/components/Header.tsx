import React from "react";
import { Link } from "react-router-dom";
import MeInfo from "./MeInfo";

function Header() {
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
      </div>
    </div>
  );
}

export default Header;
