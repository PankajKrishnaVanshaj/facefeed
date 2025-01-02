import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import RandomVideoChat from "./pages/RandomVideoChat";
import { SocketProvider } from "./hooks/SocketProvider";

const App = () => {
  return (
    <BrowserRouter>
      <Header />
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/random-video-chat" element={<RandomVideoChat />} />
        </Routes>{" "}
      </SocketProvider>
    </BrowserRouter>
  );
};

export default App;
