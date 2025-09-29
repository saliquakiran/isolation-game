import React from 'react';
import { useGame } from '../../context/GameContext';
import { BOARD_SIZE, HUMAN, AI, BLOCKED, EMPTY } from '../../utils/constants';
import { getValidMoves, getCellClassName, positionsEqual } from '../../utils/helpers';
import './GameBoard.css';

const GameBoard = () => {
  const {
    board,
    gamePhase,
    currentPlayer,
    humanPos,
    aiPos,
    validMoves,
    hintMove,
    lastMove,
    showValidMoves,
    makeMove,
    startGame,
    isLoading,
    isThinking,
    toggleValidMovesHighlight,
    clearValidMovesHighlight
  } = useGame();

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (isLoading || isThinking) return;

    if (gamePhase === 'starting') {
      // Starting phase - place initial position
      startGame(row, col);
    } else if (gamePhase === 'playing' && currentPlayer === HUMAN) {
      // Check if clicking on human piece to toggle valid moves
      if (humanPos && humanPos[0] === row && humanPos[1] === col) {
        toggleValidMovesHighlight();
        return;
      }
      
      // If valid moves are showing and clicking on a valid move, make the move
      if (showValidMoves && validMoves.some(move => move[0] === row && move[1] === col)) {
        makeMove(row, col);
        clearValidMovesHighlight(); // Clear highlighting after move
        return;
      }
      
      // Regular move making
      makeMove(row, col);
    }
  };

  // Render cell content
  const renderCellContent = (cellValue) => {
    switch (cellValue) {
      case HUMAN:
        return '👤';
      case AI:
        return '🤖';
      case BLOCKED:
        return '';
      default:
        return '';
    }
  };

  // Check if cell should be highlighted for starting position
  const isStartingPosition = (row, col) => {
    return gamePhase === 'starting' && board[row][col] === EMPTY;
  };

  // Check if cell should be highlighted for valid moves
  const isCellHighlighted = (row, col) => {
    if (gamePhase === 'playing' && currentPlayer === HUMAN) {
      // Only show valid moves when user has clicked on their piece
      if (showValidMoves) {
        return validMoves.some(move => move[0] === row && move[1] === col);
      }
    }
    
    return false;
  };

  // Check if cell is hint move
  const isHintMove = (row, col) => {
    return hintMove && positionsEqual(hintMove, [row, col]);
  };

  // Check if cell is last move
  const isLastMove = (row, col) => {
    return lastMove && positionsEqual(lastMove, [row, col]);
  };

  if (!board) {
    return (
      <div className="game-board-container">
        <div className="game-board loading">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-board-container">
      <div className="game-board">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isStarting = isStartingPosition(rowIndex, colIndex);
            const isHighlighted = isCellHighlighted(rowIndex, colIndex);
            const isHint = isHintMove(rowIndex, colIndex);
            const isLast = isLastMove(rowIndex, colIndex);
            
            let className = getCellClassName(cell, false, isHint);
            if (isStarting) className += ' starting-position';
            if (isHighlighted) className += ' valid-move';
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={className}
                data-row={rowIndex}
                data-col={colIndex}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                style={{
                  cursor: (isStarting || isHighlighted || 
                          (gamePhase === 'playing' && currentPlayer === HUMAN && humanPos && 
                           humanPos[0] === rowIndex && humanPos[1] === colIndex)) 
                    ? 'pointer' 
                    : 'default'
                }}
              >
                {renderCellContent(cell)}
                {isLast && <div className="last-move-indicator" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameBoard;
