import { useState } from "react";
import {
  FaDiceOne,
  FaDiceTwo,
  FaDiceThree,
  FaDiceFour,
  FaDiceFive,
  FaDiceSix,
  FaDice,
} from "react-icons/fa";

const diceIcons = [
  FaDiceOne,
  FaDiceTwo,
  FaDiceThree,
  FaDiceFour,
  FaDiceFive,
  FaDiceSix,
];

const DiceGame = ({ room }) => {
  const [selectedValue1, setSelectedValue1] = useState(null);
  const [selectedValue2, setSelectedValue2] = useState(null);
  const [diceValue, setDiceValue] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");
  const [turn, setTurn] = useState(1);

  const handleSelectValue = (value) => {
    if (turn === 1 && selectedValue1 === null) {
      setSelectedValue1(value);
      setTurn(2); // Switch to Player 2
    } else if (turn === 2 && selectedValue2 === null) {
      setSelectedValue2(value);
      setTurn(1); // Switch to Player 1
    }
    setMessage(""); // Clear any previous messages
  };

  const rollDice = () => {
    if (rolling) return; // Prevent multiple rolls at the same time

    if (selectedValue1 === null || selectedValue2 === null) {
      setMessage("Both players must select a value first!");
      return;
    }

    setRolling(true);
    setMessage(""); // Reset message when rolling the dice

    let interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      const newValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(newValue);
      setRolling(false);

      // Display win/loss results
      let resultMessage = "";
      if (selectedValue1 === newValue) resultMessage += "Player 1 wins! ";
      else resultMessage += "Player 1 loses. ";

      if (selectedValue2 === newValue) resultMessage += "Player 2 wins!";
      else resultMessage += "Player 2 loses.";

      setMessage(resultMessage);
    }, 500);
  };

  const resetSelections = () => {
    setSelectedValue1(null);
    setSelectedValue2(null);
    setDiceValue(null);
    setMessage("");
  };

  // Select the correct dice icon based on the diceValue
  const DiceIcon = diceValue ? diceIcons[diceValue - 1] : null;

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-8 rounded-xl shadow-lg w-full max-w-lg">
      {/* Player 1 and Player 2 selects value */}
      <div className="mb-6 w-full text-center">
        <h2 className="text-2xl font-semibold mb-4 text-blue-600">Select Your Dice Value</h2>
        <div className="flex justify-center space-x-6 mb-4">
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <button
              key={value}
              className="w-12 h-12 rounded-full bg-blue-500 text-white text-xl font-bold transition-transform transform hover:scale-105 active:bg-blue-600"
              onClick={() => handleSelectValue(value)}
              disabled={
                (turn === 1 && selectedValue1 !== null) ||
                (turn === 2 && selectedValue2 !== null)
              }
            >
              {value}
            </button>
          ))}
        </div>

        {/* Player 1 / Player 2 Message */}
        <div className="flex justify-center space-x-8 text-lg">
          {turn === 1 && selectedValue1 === null && (
            <p className="text-blue-600">Player 1, select a value</p>
          )}
          {selectedValue1 !== null && (
            <p className="text-green-600">Player 1 selected: {selectedValue1}</p>
          )}

          {turn === 2 && selectedValue1 !== null && selectedValue2 === null && (
            <p className="text-blue-600">Player 2, select a value</p>
          )}
          {selectedValue2 !== null && (
            <p className="text-green-600">Player 2 selected: {selectedValue2}</p>
          )}
        </div>
      </div>

      {/* Roll the dice */}
      {selectedValue1 !== null && selectedValue2 !== null && (
        <div
          onClick={rollDice}
          className="flex items-center justify-center p-4 bg-white rounded-lg shadow-xl text-6xl text-black cursor-pointer transition-transform transform hover:scale-105 mb-4"
        >
          {/* Display the dice icon if DiceIcon is not null */}
          {DiceIcon ? <DiceIcon /> : <FaDice />}
        </div>
      )}

      {/* Display the rolled dice value */}
      {diceValue !== null && (
        <div className="text-xl font-bold mt-4">
          <p>The dice rolled: {diceValue}</p>
        </div>
      )}

      {/* Display the win/lose message or error message */}
      <p className="text-xl mt-4 font-semibold text-red-500">{message}</p>

      {/* Buttons for reset and restart */}
      <div className="mt-6 text-center">
        <button
          onClick={resetSelections}
          className="px-6 py-2 bg-yellow-500 text-white text-lg rounded-lg shadow-md hover:bg-yellow-400 active:bg-yellow-600 transition"
        >
          Reset Game
        </button>
      </div>
    </div>
  );
};

export default DiceGame;
