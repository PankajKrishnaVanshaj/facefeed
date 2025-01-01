import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import { UserManager } from "../services/User.Manger.js";

const userManager = new UserManager();
const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: [`${process.env.CLIENT_HOST}`],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.static("public"));

const rooms = {}; // In-memory room storage

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  userManager.addUser(socket);

  // Handle room events
  socket.on("join-room", ({ room }) => {
    if (!room) {
      console.error("No room specified");
      return;
    }
    socket.join(room);
    socket.to(room).emit("ready");
    rooms[room] = rooms[room] || [];
    rooms[room].push(socket.id);
  });

  socket.on("leave-room", ({ room }) => {
    socket.leave(room);
    // Check if the room exists and remove the socket ID from the room's list
    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
    }
    socket
      .to(room)
      .emit("message", { userId: socket.id, text: "User left the chat room" });
  });

  // If the room has 1 or fewer users after the user leaves, delete it
  socket.on("delete-room", ({ room }) => {
    if (rooms[room] ) {
      delete rooms[room];
      io.to(room).emit("room-deleted", {
        message: "Room deleted due to insufficient users",
      });
      console.log(`Room ${room} has been deleted.`);
    } else {
      console.log(
        rooms[room]
          ? `Room ${room} is still active with ${rooms[room].length} users.`
          : `Room ${room} does not exist.`
      );
    }

    userManager.removeUser(socket.id);
    userManager.addUser(socket);
  });

  // Handle chat messages
  socket.on("chat", (message) => {
    const roomsList = Array.from(socket.rooms).filter(
      (room) => room !== socket.id
    );
    roomsList.forEach((room) =>
      io.to(room).emit("message", { userId: socket.id, text: message })
    );
  });

  // Handle WebRTC signaling events
  socket.on("offer", ({ offer, room }) => {
    socket.to(room).emit("offer", offer);
  });

  socket.on("answer", ({ answer, room }) => {
    socket.to(room).emit("answer", answer);
  });

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
    userManager.removeUser(socket.id);
  });
});

export { app, io, server };
