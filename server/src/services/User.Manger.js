import { RoomManager } from "./Room.Manager.js";

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
  }

  async addUser(socket) {
    if (!socket?.id) {
      // console.error("Invalid socket");
      return;
    }

    const newUser = new User(socket);
    this.users.push(newUser);
    this.queue.push(socket.id);

    // console.log(`User ${socket.id} added to queue`);
    this.logQueue();

    await this.checkQueueForRoom();
  }

  async removeUser(socketId) {
    if (!socketId) {
      // console.error("Invalid socket ID");
      return;
    }

    this.users = this.users.filter((user) => user.socket.id !== socketId);
    this.queue = this.queue.filter((id) => id !== socketId);

    // console.log(`User ${socketId} removed from queue`);
    this.logQueue();
  }

  async checkQueueForRoom() {
    if (this.queue.length >= 2) {
      const [id1, id2] = [this.queue.shift(), this.queue.shift()];
      const user1 = this.getUserById(id1);
      const user2 = this.getUserById(id2);

      if (user1 && user2) {
        // console.log(`Room creation triggered for ${user1.socket.id} and ${user2.socket.id}`);
        await this.roomManager.createRoom(user1, user2);
      } else {
        await this.requeueUsers(id1, id2);
      }
    }

    this.logQueue();
  }

  getUserById(socketId) {
    return this.users.find((user) => user.socket.id === socketId);
  }

  async requeueUsers(id1, id2) {
    if (id1) this.queue.push(id1);
    if (id2) this.queue.push(id2);
    // console.error("Users not found for room creation");
    this.logQueue();
  }

  logQueue() {
    if (this.queue.length === 0) {
      // console.log("The queue is currently empty.");
    } else {
      // console.log("Current queue:", this.queue);
    }
  }
}
