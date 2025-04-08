export const ticTacToe = (io, socket, rooms) => {
  // Handle move event
  socket.on("make-move", ({ room, board, winner }) => {
    if (!rooms[room]) return;

    rooms[room].board = board; // Update board with the new move
    rooms[room].winner = winner; // Update winner

    // Emit updated board to all clients in the room
    io.to(room).emit("move-made", { board, winner, turn: rooms[room].turn });

    // Toggle turn for the next player
    rooms[room].turn = rooms[room].turn === 0 ? 1 : 0;
  });

  // Restart the game for all users in the room
  socket.on("restart-game", ({ room }) => {
    if (!rooms[room]) return;

    rooms[room].board = Array(9).fill(null); // Reset the board
    rooms[room].turn = 0; // Player 1 starts
    rooms[room].winner = null; // Reset winner status

    // Emit reset game to all users in the room
    io.to(room).emit("game-restarted", rooms[room].board, 0); // Broadcast with starting player
  });
};
