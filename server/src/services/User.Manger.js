import { RoomManager } from "./Room.Manager.js";

// Class representing a user
class User {
  constructor(socket) {
    this.socket = socket;
  }
}

export class UserManager {
  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
    this.userTimeouts = {}; // Track timeouts for each socket
  }

  // Add a user to the user manager with a promise
  async addUser(socket) {
    if (!socket?.id) {
      console.error("Invalid socket");
      return;
    }

    //  Check if the user is already in any room before adding
    // const existingRoomId = await this.roomManager.doesRoomExistBySocket(socket);
    // if (existingRoomId) {
    //   // If user is already in a room, skip room creation
    //   console.log(`User ${socket.id} is already in room ${existingRoomId}.`);
    //   return;
    // }

    const newUser = new User(socket);
    this.users.push(newUser);
    this.queue.push(socket.id);

    await this.checkQueueForRoom(socket);
  }

  // Remove a user from the user manager with a promise
  async removeUser(socketId) {
    if (!socketId) {
      console.error("Invalid socket ID");
      return;
    }

    // Remove user from users array and queue
    this.users = this.users.filter((user) => user.socket.id !== socketId);
    this.queue = this.queue.filter((id) => id !== socketId);

    // Clear timeout for this user if it exists
    if (this.userTimeouts[socketId]) {
      clearTimeout(this.userTimeouts[socketId]);
      delete this.userTimeouts[socketId];
    }
  }

  // Check if there are enough users in the queue to create a room with a promise
  async checkQueueForRoom(socket) {
    if (this.queue.length < 2) {
      await this.waitForSecondUser(socket);
      return;
    }

    const [id1, id2] = [this.queue.shift(), this.queue.shift()];
    const user1 = this.getUserById(id1);
    const user2 = this.getUserById(id2);

    if (user1 && user2) {
      await this.roomManager.createRoom(user1, user2);
    } else {
      await this.requeueUsers(id1, id2);
    }
  }

  // Get user by socket ID
  getUserById(socketId) {
    return this.users.find((user) => user.socket.id === socketId);
  }

  // Re-add users to the queue if they weren't found
  async requeueUsers(id1, id2) {
    if (id1) this.queue.push(id1);
    if (id2) this.queue.push(id2);
    console.error("Users not found for room creation");
  }

  // Wait for a second user without timeout (just a placeholder, can be customized if needed)
  async waitForSecondUser(socket) {
    // Just wait for another user to join without timing out
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (this.queue.length >= 2) {
          clearInterval(intervalId);
          resolve(); // Proceed when the queue has 2 or more users
        }
      }, 1000); // Check every second if the queue has enough users
    });
  }
}
