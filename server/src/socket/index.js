import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import { UserManager } from "../services/User.Manger.js";

const userManager = new UserManager();
const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: ["http://localhost:5173"], // Adjust according to your client URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.static("public"));

// Handle socket connections
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Add user to user manager
  userManager.addUser(socket);

  // Handle joining a room
  socket.on("join-room", ({ room }) => {
    if (!room) {
      console.error("No room specified");
      return;
    }
    socket.join(room);
    socket.to(room).emit("ready");
  });

  // In-memory room storage (example)
  const rooms = {}; // Store room information (users, etc.)

  // When a user joins a room
  socket.on("join-room", (room) => {
    socket.join(room);
    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push(socket.id);
  });

  // Handle leave-room
  socket.on("leave-room", ({ room }) => {
    socket.leave(room);

    // Remove the user from the room
    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
    }

    // Notify others in the room
    socket.to(room).emit("message", {
      userId: socket.id,
      text: "User left the chat room",
    });

    userManager.addUser(socket);
  });

  // Handle delete-room
  socket.on("delete-room", ({ room }) => {
    // Check if the room is empty
    if (rooms[room] && rooms[room].length === 0) {
      delete rooms[room]; // Delete the room

      // Optionally, notify users if needed
      io.to(room).emit("room-deleted", { message: "Room has been deleted" });
    }
  });

  // Handle receiving chat messages and broadcasting them to the room
  socket.on("chat", (message) => {
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id); // Get the rooms the user is in
    rooms.forEach((room) => {
      io.to(room).emit("message", {
        userId: socket.id,
        text: message,
      });
    });
  });

  // Handle offer/answer exchange
  socket.on("offer", ({ offer, room }) => {
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", ({ answer, room }) => {
    socket.to(room).emit("answer", answer);
  });

  // Handle ICE candidate exchange
  socket.on("ice-candidate", ({ candidate, room }) => {
    socket.to(room).emit("ice-candidate", candidate);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    Array.from(socket.rooms)
      .filter((room) => room !== socket.id)
      .forEach((room) => {
        io.to(room).emit("message", {
          userId: socket.id,
          text: "User disconnected",
        });
      });

    // Remove user from user manager
    userManager.removeUser(socket.id);
  });
});

// Export the app, io, and server instances
export { app, io, server };
