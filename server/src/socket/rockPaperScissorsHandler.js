export const rockPaperScissorsHandler = (io, socket, rooms) => {
  socket.on("player-choice", ({ room, choice }) => {
    if (!rooms[room]) return;

    rooms[room].choices = rooms[room].choices || {};

    rooms[room].choices[choice.playerId] = choice.name.toLowerCase();
    // console.log(`Player ${choice.playerId} chose: ${choice.name}`);

    const players = Object.keys(rooms[room].choices);
    if (players.length === 2) {
      const [player1, player2] = players;
      const choice1 = rooms[room].choices[player1];
      const choice2 = rooms[room].choices[player2];

      if (choice1 && choice2) {
        const winner = calculateWinner(choice1, choice2, player1, player2);

        io.to(room).emit("result", {
          player1Choice: choice1,
          player2Choice: choice2,
          winner,
        });

        rooms[room].choices = {}; // Reset choices for the next round
      } else {
        console.log("Waiting for both players to make a choice...");
      }
    }
  });

  socket.on("restartGame", ({ room }) => {
    if (rooms[room]) {
      rooms[room].choices = {}; // Reset choices when restarting
      io.to(room).emit("gameRestarted");
    }
  });
};

// Determine the winner based on the choices
function calculateWinner(choice1, choice2, player1, player2) {
  if (choice1 === choice2) return "draw"; // It's a tie if both players choose the same thing

  if (
    (choice1 === "rock" && choice2 === "scissors") ||
    (choice1 === "paper" && choice2 === "rock") ||
    (choice1 === "scissors" && choice2 === "paper")
  ) {
    return player1; // Player 1 wins
  }

  return player2; // Player 2 wins
}
