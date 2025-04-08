import { useSocket } from "../hooks/SocketProvider";
import { useEffect, useState } from "react";
import RockPaperScissors from "./games/RockPaperScissors";
import TicTacToe from "./games/TicTacToe";
import DiceGame from "./games/DiceGame";
import SnakeGame from "./games/SnakeGame";
import LudoGame from "./games/LudoGame";
import SholoGuti from "./games/SholoGuti";
import ChessGame from "./games/ChessGame";
import SnakeLadder from "./games/SnakeLadder";

const GameSection = ({ room }) => {
  const socket = useSocket();
  const [selectedGame, setSelectedGame] = useState("TicTacToe");

  useEffect(() => {
    if (!room) return;

    // Join room event
    socket.emit("join-room", { room });

    // Listen for game change event
    socket.on("game-changed", setSelectedGame);

    return () => {
      socket.off("game-changed");
    };
  }, [room, socket]);

  // Handle game change
  const handleGameChange = (e) => {
    const game = e.target.value;
    setSelectedGame(game);
    socket.emit("change-game", game, room); // Emit game change to server
  };

  const renderGame = () => {
    switch (selectedGame) {
      case "TicTacToe":
        return <TicTacToe room={room} />;
      case "Ludo":
        return <LudoGame room={room} />;
      case "RockPaperScissors":
        return <RockPaperScissors room={room} />;
      case "DiceGame":
        return <DiceGame room={room} />;
      case "SnakeGame":
        return <SnakeGame room={room} />;
      case "SnakeLadder":
        return <SnakeLadder room={room} />;
      case "SholoGuti":
        return <SholoGuti room={room} />;
      case "ChessGame":
        return <ChessGame room={room} />;
      default:
        return <div>Select a game to play</div>;
    }
  };

  return (
    <div className="flex flex-col h-full mx-1">
      {/* Game Selection Section */}
      {/* <div className="flex items-center justify-between px-4 rounded-xl shadow-sm shadow-secondary hover:shadow-md">
        <span className="bg-primary-gradient text-transparent bg-clip-text font-bold">
          Selected Game:
        </span>
        <select
          className="rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
          value={selectedGame}
          onChange={handleGameChange}
        >
          <option value="TicTacToe">Tic Tac Toe</option>
          <option value="RockPaperScissors">Rock Paper Scissors</option>
          <option value="DiceGame">Dice</option>
          <option value="Ludo">Ludo</option>
          <option value="SnakeGame">Snake</option>
          <option value="SnakeLadder">Snake Ladder</option>
          <option value="ChessGame">Chess</option>
          <option value="SholoGuti">Sholo Guti</option>
        </select>
      </div> */}

      {/* Game Display */}
      <div className="flex-1 flex items-center justify-center">
        {renderGame()}
      </div>
    </div>
  );
};

export default GameSection;
