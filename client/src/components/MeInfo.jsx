"use client";
import { RiLogoutCircleRLine } from "react-icons/ri";
import { FiVideo } from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const MeInfo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    window.location.href = "/";
  };
  const token = localStorage.getItem("authToken");
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (token) {
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/api/v1/auth/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setUser(response.data);
        } else {
          console.log("No token found");
        }
      } catch (error) {
        console.log("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [token]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    if (isOpen) {
      window.addEventListener("click", handleOutsideClick);
      window.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen]);

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={toggleMenu}
        className="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition duration-200"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-300 shadow-lg"></div>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-fit bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200">
          <div className="p-4 border-b border-gray-200">
            <div className="text-lg font-semibold text-gray-800">
              {user?.user.name}
            </div>
            <div className="text-sm text-primary">{user?.user.email}</div>
          </div>

          <div
            onClick={closeMenu}
            className="p-2 transition duration-150 rounded-lg flex items-center cursor-pointer"
          >
            <Link
              to={"/random-video-chat"}
              className="flex items-center w-full text-left hover:bg-lightGray p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-150"
            >
              <FiVideo className="mr-2" />
              <span className="font-medium">Go Chat</span>
            </Link>
          </div>
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full text-left text-red-600 hover:bg-red-100 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition duration-150"
            >
              <RiLogoutCircleRLine className="mr-2" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeInfo;
