import { useState, useEffect } from "react";
import { FaHandRock, FaHandPaper, FaHandScissors } from "react-icons/fa";
import { useSocket } from "../../hooks/SocketProvider";

const choices = [
  { name: "rock", icon: <FaHandRock size={40} /> },
  { name: "paper", icon: <FaHandPaper size={40} /> },
  { name: "scissors", icon: <FaHandScissors size={40} /> },
];

const RockPaperScissors = ({ room }) => {
  const socket = useSocket();
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [result, setResult] = useState("");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleResult = ({ player1Choice, player2Choice, winner }) => {
      setPlayerChoice({ name: player1Choice, playerId: socket.id });
      setOpponentChoice({
        name: player2Choice,
        playerId: winner === socket.id ? socket.id : null,
      });

      if (winner === "draw") {
        setResult("It's a Tie!");
      } else {
        setResult(
          winner === socket.id
            ? "You Win! Opponent Loses!"
            : "You Lose! Opponent Wins!"
        );
      }
      setWaiting(false);
    };

    socket.on("result", handleResult);

    return () => {
      socket.off("result", handleResult);
    };
  }, [socket]);

  const handleChoice = (choice) => {
    setPlayerChoice(choice);
    setWaiting(true);
    socket.emit("player-choice", {
      room,
      choice: { name: choice.name, playerId: socket.id },
    });
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setOpponentChoice(null);
    setResult("");
    setWaiting(false);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-r from-blue-100 to-purple-200 rounded-xl shadow-xl">
  {!waiting && !result && (
    <div className="flex space-x-6">
      {choices.map((choice) => (
        <button
          key={choice.name}
          onClick={() => handleChoice(choice)}
          className="p-4 bg-white rounded-lg shadow-lg hover:scale-105 transition-transform duration-200 ease-in-out transform hover:bg-blue-50"
          disabled={waiting}
        >
          {choice.icon}
        </button>
      ))}
    </div>
  )}

  {waiting && <p className="mt-6 text-lg font-medium text-gray-600">Waiting for opponent...</p>}

  {playerChoice && opponentChoice && !waiting && (
    <div className="mt-6 text-center">
      <p className="text-2xl font-bold text-gray-800 mt-4">{result}</p>
    </div>
  )}

  {!waiting && (playerChoice || opponentChoice) && (
    <button
      onClick={resetGame}
      className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:scale-105 hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
    >
      Reset Game
    </button>
  )}
</div>

  );
};

export default RockPaperScissors;
