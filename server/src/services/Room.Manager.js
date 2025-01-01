class Room {
  constructor(user1, user2) {
    this.user1 = user1;
    this.user2 = user2;
    this.roomId = `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`; // Add roomId to the room
  }

  getUsers() {
    return [this.user1, this.user2];
  }

  getRoomId() {
    return this.roomId; // Return the roomId from the room object
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  // Create a room between two users with a promise
  async createRoom(user1, user2) {
    if (
      !user1?.socket || // Check if user1 or user2 is missing a socket object
      !user2?.socket || // or if user1 and user2 have no socket object
      user1.socket.id === user2.socket.id // or if both users are the same (by comparing socket IDs)
    ) {
      console.error("Invalid or identical users for room creation"); // Log an error message if the condition is true
      return; // Exit the function if the condition is met (invalid or identical users)
    }

    const existingRoomId = await this.doesRoomExist(user1, user2);

    // If a room already exists, create a new room instead of returning the existing room ID
    const roomId = this.generateRoomId();
    const newRoom = new Room(user1, user2);

    // If a room exists, we'll still create a new room and emit the offer to both users
    this.rooms.set(roomId, newRoom);

    // Send the offer to both users for the new room (whether it's a new room or recreated one)
    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    console.log(
      `Room created with ID: ${roomId} between ${user1.socket.id} and ${user2.socket.id}`
    );
    return roomId; // Return the new room ID
  }

  // Check if a room already exists between two users, and return the roomId if it exists with a promise
  async doesRoomExist(user1, user2) {
    for (let [roomId, room] of this.rooms.entries()) {
      const users = room.getUsers();
      if (
        (users[0].socket.id === user1.socket.id &&
          users[1].socket.id === user2.socket.id) ||
        (users[0].socket.id === user2.socket.id &&
          users[1].socket.id === user1.socket.id)
      ) {
        return roomId; // Return the roomId if the room exists
      }
    }
    return null; // Return null if no room exists
  }

  // Handle the reconnection of users and send the offer if needed with a promise
  async handleReconnection(user) {
    const existingRoomId = await this.doesRoomExistBySocket(user.socket);
    if (existingRoomId) {
      const room = this.rooms.get(existingRoomId);
      await this.sendOfferToUsers(room);
    }
  }

  // Check if a user is part of any room by socket ID with a promise
  async doesRoomExistBySocket(socket) {
    for (let [roomId, room] of this.rooms.entries()) {
      const users = room.getUsers();
      if (
        users[0].socket.id === socket.id ||
        users[1].socket.id === socket.id
      ) {
        return roomId; // Return roomId if the user is in the room
      }
    }
    return null; // Return null if no room exists for the user
  }

  // Send offer to both users in the room with a promise
  async sendOfferToUsers(room) {
    const roomId = room.getRoomId(); // Get roomId from the room object
    await room.user1.socket.emit("send-offer", { roomId });
    await room.user2.socket.emit("send-offer", { roomId });
  }

  // Generate a unique room ID
  generateRoomId() {
    return `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}
