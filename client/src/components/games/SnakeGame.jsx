import { useState, useEffect } from "react";

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: 1 };
const FOOD_POSITION = () => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
});

const SnakeGame = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(FOOD_POSITION);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(moveSnake, 150);
    return () => clearInterval(interval);
  }, [snake, gameOver]);

  const moveSnake = () => {
    const newSnake = [...snake];
    const head = {
      x: newSnake[0].x + direction.x,
      y: newSnake[0].y + direction.y,
    };

    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE ||
      checkCollision(head)
    ) {
      setGameOver(true);
      return;
    }

    newSnake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      setFood(FOOD_POSITION);
      setScore(score + 1);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  };

  const checkCollision = (head) => {
    return snake.some(
      (segment) => segment.x === head.x && segment.y === head.y
    );
  };

  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (
      [
        "w",
        "arrowup",
        "s",
        "arrowdown",
        "a",
        "arrowleft",
        "d",
        "arrowright",
      ].includes(key)
    ) {
      e.preventDefault();
    }
    switch (key) {
      case "w":
      case "arrowup":
        if (direction.y === 0) setDirection({ x: 0, y: -1 });
        break;
      case "s":
      case "arrowdown":
        if (direction.y === 0) setDirection({ x: 0, y: 1 });
        break;
      case "a":
      case "arrowleft":
        if (direction.x === 0) setDirection({ x: -1, y: 0 });
        break;
      case "d":
      case "arrowright":
        if (direction.x === 0) setDirection({ x: 1, y: 0 });
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction]);

  const restartGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(FOOD_POSITION);
    setGameOver(false);
    setScore(0);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full ">
      <div
        className="relative border-4 border-green-500 shadow-2xl rounded-lg overflow-hidden bg-gray-800 text-white"
        style={{
          width: "400px",
          height: "400px",
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        }}
      >
        {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isSnake = snake.some(
            (segment) => segment.x === x && segment.y === y
          );
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={i}
              className={`w-full h-full transition-all ${
                isSnake
                  ? "bg-red-500 shadow-md shadow-red-400 animate-pulse rounded-md"
                  : isFood
                  ? "bg-green-500 shadow-md shadow-green-400 animate-bounce rounded-full"
                  : "bg-gray-800"
              }`}
            ></div>
          );
        })}
      </div>

      {gameOver ? (
        <div className="flex flex-col items-center mt-3 bg-gray-900 p-4 rounded-lg shadow-lg">
          <p className="text-2xl font-semibold text-red-500 mb-3 animate-pulse">
            🚨 Game Over! Try Again. 🚨
          </p>
          <button
            className="py-2 px-4 bg-red-600 text-white text-lg font-bold rounded-lg shadow-md hover:bg-red-700 transition-transform transform hover:scale-105 active:scale-95"
            onClick={restartGame}
          >
            🔄 Restart Game
          </button>
          <h2 className="text-lg font-bold text-white">Score: {score}</h2>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center">
          <div className="grid grid-cols-3 gap-2">
            <button
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-110"
              onClick={() => setDirection({ x: 0, y: -1 })}
            >
              ⬆️
            </button>
            <div></div>
            <button
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-110"
              onClick={() => setDirection({ x: 1, y: 0 })}
            >
              ➡️
            </button>
            <button
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-110"
              onClick={() => setDirection({ x: -1, y: 0 })}
            >
              ⬅️
            </button>
            <div></div>
            <button
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-110"
              onClick={() => setDirection({ x: 0, y: 1 })}
            >
              ⬇️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;
