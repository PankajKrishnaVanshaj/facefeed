import { useState, useEffect } from "react";
import { useSocket } from "../../hooks/SocketProvider";

const TicTacToe = ({ room }) => {
  const socket = useSocket();
  const [board, setBoard] = useState(Array(25).fill(null)); // 5x5 board
  const [isTurn, setIsTurn] = useState(true);
  const [winner, setWinner] = useState(null);

  const handleMove = (index) => {
    if (!board || winner) return; // Prevent move if game is over
  
    const newBoard = [...board];
  
    // Toggle between "X" and "O" if the cell already has a value
    newBoard[index] = newBoard[index] === "X" ? "O" : newBoard[index] === "O" ? "X" : isTurn ? "X" : "O";
  
    const newWinner = checkWinner(newBoard);
  
    setBoard(newBoard);
    setWinner(newWinner);
    setIsTurn(!isTurn);
  
    socket.emit("make-move", { room, board: newBoard, winner: newWinner });
  };
  

  const checkWinner = (board) => {
    const winPatterns = generateWinPatterns(5);

    for (let pattern of winPatterns) {
      const [a, b, c, d, e] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === board[d] && board[a] === board[e]) {
        return board[a]; // Winner is "X" or "O"
      }
    }
    return board.includes(null) ? null : "It's a tie!";
  };

  const generateWinPatterns = (size) => {
    const patterns = [];

    // Rows
    for (let row = 0; row < size; row++) {
      for (let col = 0; col <= size - 5; col++) {
        patterns.push([row * size + col, row * size + col + 1, row * size + col + 2, row * size + col + 3, row * size + col + 4]);
      }
    }

    // Columns
    for (let col = 0; col < size; col++) {
      for (let row = 0; row <= size - 5; row++) {
        patterns.push([row * size + col, (row + 1) * size + col, (row + 2) * size + col, (row + 3) * size + col, (row + 4) * size + col]);
      }
    }

    // Diagonal (Top-left to Bottom-right)
    for (let row = 0; row <= size - 5; row++) {
      for (let col = 0; col <= size - 5; col++) {
        patterns.push([
          row * size + col,
          (row + 1) * size + col + 1,
          (row + 2) * size + col + 2,
          (row + 3) * size + col + 3,
          (row + 4) * size + col + 4
        ]);
      }
    }

    // Diagonal (Top-right to Bottom-left)
    for (let row = 0; row <= size - 5; row++) {
      for (let col = 4; col < size; col++) {
        patterns.push([
          row * size + col,
          (row + 1) * size + col - 1,
          (row + 2) * size + col - 2,
          (row + 3) * size + col - 3,
          (row + 4) * size + col - 4
        ]);
      }
    }

    return patterns;
  };

  useEffect(() => {
    socket.on("move-made", ({ board, winner, turn }) => {
      if (!board) return;
      setBoard(board);
      setWinner(winner);
      setIsTurn(turn);
    });

    socket.on("game-restarted", ({ board: newBoard, turn }) => {
      if (!newBoard) return;
      setBoard(newBoard);
      setIsTurn(turn);
      setWinner(null);
    });

    return () => {
      socket.off("move-made");
      socket.off("game-restarted");
    };
  }, [socket]);

  const restartGame = () => {
    const newBoard = Array(25).fill(null);
    setBoard(newBoard);
    setIsTurn(true);
    setWinner(null);
    socket.emit("restart-game", { room, board: newBoard, turn: true });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-5 gap-2">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleMove(index)}
            className="w-16 h-16 text-2xl font-bold bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
          >
            {cell}
          </button>
        ))}
      </div>
      {winner && (
        <div className="text-center mt-4">
          <p className="text-xl font-bold">{winner === "It's a tie!" ? winner : `Winner: ${winner}`}</p>
          <button
            onClick={restartGame}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;
