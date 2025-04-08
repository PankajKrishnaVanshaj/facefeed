import React, { useState } from 'react';

const pieceSymbols = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
};

const initialBoard = [
  [
    { type: 'rook', color: 'black', hasMoved: false },
    { type: 'knight', color: 'black', hasMoved: false },
    { type: 'bishop', color: 'black', hasMoved: false },
    { type: 'queen', color: 'black', hasMoved: false },
    { type: 'king', color: 'black', hasMoved: false },
    { type: 'bishop', color: 'black', hasMoved: false },
    { type: 'knight', color: 'black', hasMoved: false },
    { type: 'rook', color: 'black', hasMoved: false },
  ],
  Array.from({ length: 8 }, () => ({ type: 'pawn', color: 'black', hasMoved: false })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array.from({ length: 8 }, () => ({ type: 'pawn', color: 'white', hasMoved: false })),
  [
    { type: 'rook', color: 'white', hasMoved: false },
    { type: 'knight', color: 'white', hasMoved: false },
    { type: 'bishop', color: 'white', hasMoved: false },
    { type: 'queen', color: 'white', hasMoved: false },
    { type: 'king', color: 'white', hasMoved: false },
    { type: 'bishop', color: 'white', hasMoved: false },
    { type: 'knight', color: 'white', hasMoved: false },
    { type: 'rook', color: 'white', hasMoved: false },
  ],
];

const ChessGame = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [validMoves, setValidMoves] = useState([]);
  const [promotionPosition, setPromotionPosition] = useState(null);
  const [enPassantTarget, setEnPassantTarget] = useState(null);

  const isSquareUnderAttack = (position, color) => {
    const opponent = color === 'white' ? 'black' : 'white';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === opponent) {
          if (isValidMove({ row, col }, position, piece, true)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isPathClear = (start, end) => {
    const rowStep = Math.sign(end.row - start.row);
    const colStep = Math.sign(end.col - start.col);
    let currentRow = start.row + rowStep;
    let currentCol = start.col + colStep;

    while (currentRow !== end.row || currentCol !== end.col) {
      if (board[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return true;
  };

  const canCastle = (start, end, color) => {
    const row = color === 'white' ? 7 : 0;
    if (start.row !== row || end.row !== row) return false;

    const rookCol = end.col > 4 ? 7 : 0;
    const rook = board[row][rookCol];
    if (!rook || rook.type !== 'rook' || rook.hasMoved) return false;

    const middleCol = (start.col + end.col) / 2;
    if (!isPathClear(start, { row, col: middleCol })) return false;

    // Check if squares are under attack
    const step = end.col > start.col ? 1 : -1;
    for (let i = 0; i <= 2; i++) {
      const col = start.col + step * i;
      if (isSquareUnderAttack({ row, col }, color)) return false;
    }

    return true;
  };

  const isValidMove = (start, end, piece, ignoreKingSafety = false) => {
    const targetPiece = board[end.row][end.col];
    if (targetPiece?.color === piece.color) return false;

    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    const direction = piece.color === 'white' ? -1 : 1;

    if (start.row === end.row && start.col === end.col) return false;

    let valid = false;
    switch (piece.type) {
      case 'pawn':
        if (colDiff === 0 && !targetPiece) {
          if (rowDiff === direction) valid = true;
          else if (
            rowDiff === 2 * direction &&
            ((piece.color === 'white' && start.row === 6) || 
             (piece.color === 'black' && start.row === 1)) &&
            !board[start.row + direction][start.col]
          ) {
            valid = true;
          }
        } else if (absColDiff === 1 && rowDiff === direction) {
          valid = targetPiece || (enPassantTarget?.row === end.row && enPassantTarget?.col === end.col);
        }
        break;

      case 'knight':
        valid = (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
        break;

      case 'bishop':
        valid = absRowDiff === absColDiff && isPathClear(start, end);
        break;

      case 'rook':
        valid = (absRowDiff === 0 || absColDiff === 0) && isPathClear(start, end);
        break;

      case 'queen':
        valid = (absRowDiff === absColDiff || absRowDiff === 0 || absColDiff === 0) && isPathClear(start, end);
        break;

      case 'king':
        if (absRowDiff > 1 || absColDiff > 1) {
          valid = !piece.hasMoved && absColDiff === 2 && rowDiff === 0 && canCastle(start, end, piece.color);
        } else {
          valid = true;
        }
        break;

      default:
        valid = false;
    }

    if (!valid || ignoreKingSafety) return valid;

    // Simulate move to check for king safety
    const tempBoard = board.map(row => [...row]);
    tempBoard[end.row][end.col] = piece;
    tempBoard[start.row][start.col] = null;
    
    // Find current player's king position
    let kingPos;
    tempBoard.forEach((row, r) => row.forEach((p, c) => {
      if (p?.type === 'king' && p.color === currentPlayer) kingPos = { row: r, col: c };
    }));

    return !isSquareUnderAttack(kingPos, currentPlayer);
  };

  const getValidMoves = (position) => {
    const moves = [];
    const piece = board[position.row][position.col];
    if (!piece) return moves;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (isValidMove(position, { row, col }, piece)) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  };

  const handleSquareClick = (row, col) => {
    if (promotionPosition) return;

    if (!selectedPosition) {
      const piece = board[row][col];
      if (piece?.color === currentPlayer) {
        setSelectedPosition({ row, col });
        setValidMoves(getValidMoves({ row, col }));
      }
    } else {
      const piece = board[selectedPosition.row][selectedPosition.col];
      if (piece && isValidMove(selectedPosition, { row, col }, piece)) {
        const newBoard = board.map(row => [...row]);
        const newPiece = { ...piece, hasMoved: true };

        // Handle special moves
        if (piece.type === 'pawn') {
          // En passant capture
          if (enPassantTarget?.row === row && enPassantTarget?.col === col) {
            newBoard[selectedPosition.row][col] = null;
          }
          // Set en passant target
          setEnPassantTarget(Math.abs(row - selectedPosition.row) === 2 ? 
            { row: row + (piece.color === 'white' ? 1 : -1), col } : null);
          
          // Promotion
          if ((piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7)) {
            setPromotionPosition({ row, col });
            return;
          }
        } else {
          setEnPassantTarget(null);
        }

        // Castling
        if (piece.type === 'king' && Math.abs(col - selectedPosition.col) === 2) {
          const rookCol = col > selectedPosition.col ? 7 : 0;
          const newRookCol = col > selectedPosition.col ? 5 : 3;
          newBoard[row][newRookCol] = { ...board[row][rookCol], hasMoved: true };
          newBoard[row][rookCol] = null;
        }

        newBoard[row][col] = newPiece;
        newBoard[selectedPosition.row][selectedPosition.col] = null;
        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
      }
      setSelectedPosition(null);
      setValidMoves([]);
    }
  };

  const handlePromotion = (type) => {
    if (!promotionPosition) return;
    
    const newBoard = board.map(row => [...row]);
    newBoard[promotionPosition.row][promotionPosition.col] = {
      type,
      color: currentPlayer,
      hasMoved: true
    };
    setBoard(newBoard);
    setPromotionPosition(null);
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <div className="mb-4 text-xl font-bold text-gray-700 text-center">
          Current Player: {currentPlayer}
        </div>
        <div className="relative grid grid-cols-8 gap-0 border-2 border-gray-800">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isSelected = selectedPosition?.row === rowIndex && 
                selectedPosition?.col === colIndex;
              const isValid = validMoves.some(move => 
                move.row === rowIndex && move.col === colIndex
              );
              const isLight = (rowIndex + colIndex) % 2 === 0;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-10 h-10 flex items-center justify-center text-4xl cursor-pointer
                    ${isLight ? 'bg-amber-100' : 'bg-amber-800'}
                    ${isSelected ? 'bg-blue-300' : ''}
                    ${isValid ? 'bg-green-200' : ''}
                    ${piece?.color === 'white' ? 'text-gray-100' : 'text-gray-900'}
                    transition-colors duration-200`}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                  {piece && pieceSymbols[piece.type][piece.color]}
                </div>
              );
            })
          )}
          
          {promotionPosition && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg grid grid-cols-2 gap-2">
                {['queen', 'rook', 'bishop', 'knight'].map(type => (
                  <button
                    key={type}
                    className="w-16 h-16 flex items-center justify-center text-4xl
                      hover:bg-gray-200 rounded transition-colors duration-200"
                    onClick={() => handlePromotion(type)}
                  >
                    {pieceSymbols[type][currentPlayer]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChessGame;