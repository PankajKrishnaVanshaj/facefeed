class Room {
  constructor(user1, user2 = null) {
    this.user1 = user1;
    this.user2 = user2;
    this.roomId = `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`; 
  }

  getUsers() {
    return [this.user1, this.user2].filter(Boolean);
  }

  getRoomId() {
    return this.roomId;
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  async createRoom(user1, user2) {
    if (!user1?.socket || !user2?.socket || user1.socket.id === user2.socket.id) {
      // console.error("Invalid or identical users for room creation");
      return;
    }

    const roomId = this.generateRoomId();
    const newRoom = new Room(user1, user2);
    this.rooms.set(roomId, newRoom);

    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    // console.log(`Room created with ID: ${roomId} between ${user1.socket.id} and ${user2.socket.id}`);
    return roomId;
  }

  generateRoomId() {
    return `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`; 
  }
}
