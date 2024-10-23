// Import the RoomManager class
import { RoomManager } from "./Room.Manager.js";

// Class representing a user
class User {
  constructor(socket) {
    this.socket = socket;
  }
}

// Class responsible for managing users
export class UserManager {
  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  // Method to add a user to the user manager
  addUser(socket) {
    if (!socket || !socket.id) {
      console.error("Invalid socket");
      return;
    }

    // Add the user to the users array
    const newUser = new User(socket);
    this.users.push(newUser);

    // Add the user's socket ID to the queue
    this.queue.push(socket.id);

    // Check if there are enough users in the queue to create a room
    this.checkQueueForRoom();
  }

  // Method to remove a user from the user manager
  removeUser(socketId) {
    if (!socketId) {
      console.error("Invalid socket ID");
      return;
    }

    // Find the user with the specified socket ID
    const userIndex = this.users.findIndex(
      (user) => user.socket.id === socketId
    );

    // Remove the user from the users array
    if (userIndex !== -1) {
      this.users.splice(userIndex, 1);
    }

    // Remove the socket ID from the queue
    this.queue = this.queue.filter((id) => id !== socketId);
  }

  // Method to check if there are enough users in the queue to create a room
  checkQueueForRoom() {
    while (this.queue.length >= 2) {
      // Remove two users from the queue
      const id1 = this.queue.shift();
      const id2 = this.queue.shift();

      // Find the users with the specified socket IDs
      const user1 = this.users.find((user) => user.socket.id === id1);
      const user2 = this.users.find((user) => user.socket.id === id2);

      // If both users exist, create a room between them
      if (user1 && user2) {
        this.roomManager.createRoom(user1, user2);
      } else {
        console.error("Users not found for room creation");

        // If any user is missing, return them to the queue
        if (id1) this.queue.push(id1);
        if (id2) this.queue.push(id2);
      }
    }
  }
}
