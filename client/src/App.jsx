import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Home from "./pages/Home";
import RandomVideoChat from "./pages/RandomVideoChat";
import AuthWrapper from "./components/AuthWrapper"; // Import AuthWrapper

// Custom hook to handle token logic
const useAuthToken = () => {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("authToken");
    } catch (error) {
      console.error("Failed to get token from localStorage:", error);
      return null;
    }
  });

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const authToken = queryParams.get("token");

    if (authToken) {
      try {
        localStorage.setItem("authToken", authToken);
        setToken(authToken);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } catch (error) {
        console.error("Failed to set token in localStorage:", error);
      }
    }
  }, []); // Empty dependency array means this effect runs once

  return token;
};

const App = () => {
  const token = useAuthToken();

  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/random-video-chat"
          element={<AuthWrapper token={token} Component={RandomVideoChat} />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
