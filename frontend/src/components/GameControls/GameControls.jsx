import React from 'react';
import { useGame } from '../../context/GameContext';
import { HUMAN } from '../../utils/constants';
import './GameControls.css';

const GameControls = () => {
  const {
    gamePhase,
    currentPlayer,
    moveHistory,
    isLoading,
    isThinking,
    newGame,
    getHint,
    undoMove
  } = useGame();

  // Add safety checks to prevent undefined values
  const safeGamePhase = gamePhase || 'starting';
  const safeCurrentPlayer = currentPlayer || HUMAN;
  const safeMoveHistory = moveHistory || [];
  const safeIsLoading = isLoading || false;
  const safeIsThinking = isThinking || false;

  // Check if there are any human moves to undo
  const hasHumanMoves = safeMoveHistory.some(move => move.player === HUMAN);
  const canUndo = hasHumanMoves && safeGamePhase !== 'ended';
  const canGetHint = safeGamePhase === 'playing' && safeCurrentPlayer === HUMAN && !safeIsLoading && !safeIsThinking;
  const canStartNew = !safeIsLoading && !safeIsThinking;

  return (
    <div className="game-controls">
      <button
        className="btn btn-primary btn-new-game"
        onClick={newGame}
        disabled={!canStartNew}
        title="New Game"
      >
        ↻
      </button>
      
      <button
        className="btn btn-secondary"
        onClick={undoMove}
        disabled={!canUndo}
        title="Undo your last move"
      >
        ↶
      </button>
      
      <button
        className="btn btn-secondary"
        onClick={getHint}
        disabled={!canGetHint}
        title="Get AI suggestion for your next move"
      >
        💡
      </button>
    </div>
  );
};

export default GameControls;
