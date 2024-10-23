class Room {
  constructor(user1, user2) {
    this.user1 = user1;
    this.user2 = user2;
  }

  // Method to get all users in the room
  getUsers() {
    return [this.user1, this.user2];
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  // Method to create a room between two users
  createRoom(user1, user2) {
    if (!user1?.socket || !user2?.socket) {
      console.error("Invalid users provided for room creation");
      return;
    }

    // Check if both users are the same (i.e., they have the same socket ID)
    if (user1.socket.id === user2.socket.id) {
      console.log("Cannot create a room between the same user.");
      return;
    }

    // Check if a room already exists for these users
    if (this.doesRoomExist(user1, user2)) {
      console.log(
        `Room already exists between ${user1.socket.id} and ${user2.socket.id}`
      );
      return;
    }

    const roomId = this.generateRoomId();
    const newRoom = new Room(user1, user2);
    this.rooms.set(roomId, newRoom);

    // Notify both users about the room
    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    console.log(
      `Room created with ID: ${roomId} between ${user1.socket.id} and ${user2.socket.id}`
    );
  }

  // Method to check if a room already exists between two users
  doesRoomExist(user1, user2) {
    for (let room of this.rooms.values()) {
      const users = room.getUsers();
      if (
        (users[0].socket.id === user1.socket.id &&
          users[1].socket.id === user2.socket.id) ||
        (users[0].socket.id === user2.socket.id &&
          users[1].socket.id === user1.socket.id)
      ) {
        return true;
      }
    }
    return false;
  }

  // Method to generate a unique room ID
  generateRoomId() {
    return `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}
