import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { SocketProvider } from "./hooks/SocketProvider.jsx";

createRoot(document.getElementById("root")).render(
  // <SocketProvider>
    <App />
  // </SocketProvider>
);
