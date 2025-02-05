import { useState } from "react";
import {
  FaDiceOne,
  FaDiceTwo,
  FaDiceThree,
  FaDiceFour,
  FaDiceFive,
  FaDiceSix,
} from "react-icons/fa";

const diceIcons = [
  FaDiceOne,
  FaDiceTwo,
  FaDiceThree,
  FaDiceFour,
  FaDiceFive,
  FaDiceSix,
];

const snakePositions = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};
const ladderPositions = {
  7: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 96,
};

// Map snakes and ladders to string format like "16/6"
const mappedSnakes = Object.entries(snakePositions).map(
  ([key, value]) => `${key}/${value}`
);
const mappedLadders = Object.entries(ladderPositions).map(
  ([key, value]) => `${key}/${value}`
);

export default function SnakeLadderGame() {
  const [players, setPlayers] = useState([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [dice, setDice] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  

  const rollDice = () => {
    if (gameOver) return; // Prevent rolling when the game is over

    const roll = Math.floor(Math.random() * 6) + 1;
    setDice(roll);
    let newPosition = players[currentPlayer] + roll;
    if (newPosition in snakePositions)
      newPosition = snakePositions[newPosition];
    if (newPosition in ladderPositions)
      newPosition = ladderPositions[newPosition];
    if (newPosition <= 100) {
      setPlayers((prev) => {
        const updatedPlayers = [...prev];
        updatedPlayers[currentPlayer] = newPosition;
        return updatedPlayers;
      });
    }
    setCurrentPlayer((prev) => (prev === 0 ? 1 : 0));

    // Check if a player has won
    if (players[0] === 100 || players[1] === 100) {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    setPlayers([0, 0]);
    setCurrentPlayer(0);
    setDice(0);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2 mt-1">
      {!gameOver ? (
        <div className="flex justify-center items-center gap-8 p-2 mt-1">
          <p className="text-md font-semibold text-blue-600">
            Player A: {players[0]}
          </p>
          <div onClick={rollDice} className="flex gap-2 items-center text-5xl">
            🎲<span className="text-xl font-bold">{dice}</span>
          </div>
          <p className="text-md font-semibold text-yellow-500">
            Player B: {players[1]}
          </p>
        </div>
      ) : (
        <div className="flex flex-row justify-center items-center space-x-4">
          {players.includes(100) && (
            <p className="text-green-600 font-bold text-xl text-center">
              🎉 Player {players.indexOf(100) + 1} Won! 🎉
            </p>
          )}
          <button
            onClick={resetGame}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-1.5 rounded-lg shadow-md transition duration-300 transform hover:scale-105"
          >
            Reset Game
          </button>
        </div>
      )}
      <div className="relative grid grid-cols-10 gap-0.5 border-4 border-gray-800 p-0.5 bg-gray-300 rounded-lg shadow-md">
        {/* Snakes on the left */}
        <div className="absolute left-[-35px] top-0 text-xs font-semibold text-red-500">
          <div className="flex items-center justify-center mb-1 text-xl">
            🐍
          </div>
          {mappedSnakes.map((snake, index) => (
            <p
              className="flex items-center justify-center border text-[9px] font-bold rounded-md w-8"
              key={index}
            >
              {snake}
            </p>
          ))}
        </div>

        {/* Board cells */}
        {[...Array(100)].map((_, i) => {
          const cell = 100 - i;
          return (
            <div
              key={cell}
              className={`relative w-8 h-8 flex items-center justify-center border text-[10px] font-bold rounded-md 
                ${
                  players[0] === cell
                    ? "bg-blue-500 text-white"
                    : players[1] === cell
                    ? "bg-yellow-500 text-white"
                    : snakePositions[cell]
                    ? "bg-red-500 text-white"
                    : ladderPositions[cell]
                    ? "bg-green-500 text-white"
                    : "bg-white"
                }`}
            >
              {cell}
              {snakePositions[cell] && (
                <span className="absolute top-0 right-0 text-[8px] text-white font-semibold">
                  🐍 {snakePositions[cell]}
                </span>
              )}
              {ladderPositions[cell] && (
                <span className="absolute top-0 right-0 text-[8px] text-white font-semibold">
                  🪜 {ladderPositions[cell]}
                </span>
              )}
            </div>
          );
        })}

        {/* Ladders on the right */}
        <div className="absolute right-[-35px] top-0 text-xs font-semibold text-green-500">
          <div className="flex items-center justify-center mb-1 text-xl">
            🪜
          </div>
          {mappedLadders.map((ladder, index) => (
            <p
              className="flex items-center justify-center border text-[9px] font-bold rounded-md w-8 "
              key={index}
            >
              {ladder}
            </p>
          ))}
        </div>
      </div>
      <p
        className={`text-md font-semibold ${
          currentPlayer === 0 ? "text-blue-500" : "text-yellow-500"
        }`}
      >
        Current Turn: Player {currentPlayer + 1}
      </p>
    </div>
  );
}
