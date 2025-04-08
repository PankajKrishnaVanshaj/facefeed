import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import RandomVideoChat from "./pages/RandomVideoChat";

const App = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/random-video-chat" element={<RandomVideoChat />} />
      </Routes>
    </>
  );
};

export default App;
