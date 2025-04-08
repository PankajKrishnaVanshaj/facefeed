import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import { UserManager } from "../services/User.Manger.js";
import { rockPaperScissorsHandler } from "./rockPaperScissorsHandler.js";
import { ticTacToe } from "./ticTacToe.js";
import { dice } from "./dice.js";

const userManager = new UserManager();
const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: [process.env.CLIENT],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.static("public"));

const rooms = {}; // In-memory room storage

io.on("connection", (socket) => {
  // console.log("User connected:", socket.id);
  userManager.addUser(socket);
  rockPaperScissorsHandler(io, socket, rooms);
  ticTacToe(io, socket, rooms);
  dice(io, socket, rooms);

  // console.log("Current rooms:", rooms);

  socket.on("join-room", ({ room }) => {
    if (!room) {
      // console.error("No room specified");
      return;
    }
  
    // Join the room
    socket.join(room);
  
    // Add the user to the room in memory
    rooms[room] = rooms[room] || [];
    if (!rooms[room].includes(socket.id)) {
      rooms[room].push(socket.id);
    }
  
    // Log the updated rooms and users in the room
    // console.log(`User ${socket.id} joined room ${room}`);
    // console.log("Updated rooms:", rooms);
    // console.log(`Users in room ${room}:`, rooms[room]);
  
    // Notify other users in the room
    socket.to(room).emit("ready");
  });

  socket.on("leave-room", async ({ room }) => {
    if (!room) {
      console.error("No room specified");
      return;
    }
  
    // Leave the room
    socket.leave(room);
  
    // Update the room's user list
    if (rooms[room]) {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);  // Remove socket.id from the room
      if (rooms[room].length === 0) {
        delete rooms[room];  // Remove empty room
      }
    }
  
    // Log the updated rooms and users in the room
    // console.log(`User ${socket.id} left room ${room}`);
    // console.log("Updated rooms:", rooms);
    // console.log(`Users in room ${room}:`, rooms[room] || "Room is empty");
  
    // Notify other users in the room
    socket
      .to(room)
      .emit("message", { userId: socket.id, text: "User left the chat room" });
  
    // Add user to UserManager queue
    try {
      await userManager.removeUser(socket.id);
      await userManager.addUser(socket);
      // console.log(
      //   `User ${socket.id} added to UserManager queue after leaving room ${room}`
      // );
    } catch (error) {
      console.error("Error adding user to UserManager:", error);
    }
  });

  socket.on("chat", (message) => {
    const roomsList = Array.from(socket.rooms).filter(
      (room) => room !== socket.id
    );
    roomsList.forEach((room) =>
      io.to(room).emit("message", { userId: socket.id, text: message })
    );
    // console.log(`User ${socket.id} sent message: ${message}`);
  });

  socket.on("offer", ({ offer, room }) => {
    socket.to(room).emit("offer", offer);
    // console.log(`Offer sent to room ${room} from user ${socket.id}`);
  });

  socket.on("answer", ({ answer, room }) => {
    socket.to(room).emit("answer", answer);
    // console.log(`Answer sent to room ${room} from user ${socket.id}`);
  });

  socket.on("ice-candidate", ({ candidate, room }) => {
    socket.to(room).emit("ice-candidate", candidate);
    // console.log(`ICE candidate sent to room ${room} from user ${socket.id}`);
  });

  socket.on("change-game", (game, room) => {
    socket.to(room).emit("game-changed", game); // Emit to all users in the room
  });

  socket.on("disconnect", () => {
    // console.log("User disconnected:", socket.id);

    Object.keys(rooms).forEach((room) => {
      rooms[room] = rooms[room].filter((id) => id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
    });

    // console.log("Updated rooms after disconnection:", rooms);

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
