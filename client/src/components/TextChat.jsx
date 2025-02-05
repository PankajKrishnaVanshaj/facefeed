import { useState, useEffect, useRef } from "react";
import { useSocket } from "../hooks/SocketProvider";
import AdsSection from '../components/AdsSection'

const TextChat = ({ room }) => {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const containRef = useRef(null);
  const endOfMessagesRef = useRef(null); // Ref to ensure scroll to bottom

  useEffect(() => {
    if (!room) return;

    setInput("");
    setMessages([]);

    // Join room event
    socket.emit("join-room", { room });

    // Listen for new messages
    socket.on("message", (message) => {
      setMessages((prevMessages) => {
        // Check if the last message is the same as the incoming message from the user
        const isDuplicate =
          prevMessages.length > 0 &&
          prevMessages[prevMessages.length - 1].text === message.text &&
          message.userId === socket.id;

        // Prevent adding the duplicate message
        if (isDuplicate) return prevMessages;

        return [...prevMessages, message];
      });
    });

    return () => {
      socket.off("message");
    };
  }, [room, socket]);

  // Function to send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (input.trim()) {
      socket.emit("chat", input);
      setInput("");
    }
  };

  // Automatically scroll to bottom when messages change
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full justify-between p-1.5">
      <AdsSection/>
      {/* Chat messages container */}
      <div
        className="flex-1 p-4 bg-white overflow-auto max-h-[200px] scrollbar-hide"
        ref={containRef}
      >
        <div className="flex flex-col gap-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`py-1 px-2 rounded-xl max-w-[85%] ${
                msg.userId === socket.id
                  ? "bg-lightGray text-primary self-end"
                  : "bg-lightGray text-secondary self-start"
              }`}
            >
              <strong>{msg.userId === socket.id ? "You" : "Stranger"}: </strong>
              <span className="break-words">{msg.text}</span>
            </div>
          ))}
          {/* Dummy div to keep track of the end of the messages */}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      {/* Input form */}
      <form
        onSubmit={sendMessage}
        className="bg-white border rounded-full border-gray-300 flex items-center"
      >
        <input
          type="text"
          placeholder="Type message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-l-full px-4 py-2 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-primary-gradient hover:scale-105 text-white font-bold py-2 px-4 rounded-r-full transition duration-200"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default TextChat;
