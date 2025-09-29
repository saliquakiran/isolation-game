import React from 'react';
import { useGame } from '../../context/GameContext';
import { HUMAN, AI } from '../../utils/constants';
import { getValidMoves } from '../../utils/helpers';
import './GameInfo.css';

const GameInfo = () => {
  const {
    board,
    humanPos,
    aiPos,
    currentPlayer,
    gamePhase,
    statusMessage,
    isThinking,
    stats
  } = useGame();

  // Calculate valid moves for each player with safety checks
  const humanMoves = (board && humanPos) ? getValidMoves(board, humanPos).length : 0;
  const aiMoves = (board && aiPos) ? getValidMoves(board, aiPos).length : 0;

  return (
    <div className="game-info">
      <div className="player-info">
        <div className="player human-player">
          <div className="player-icon">👤</div>
          <div className="player-details">
            <h3>Human Player</h3>
            <div className="moves-count">Moves: {humanMoves}</div>
            {currentPlayer === HUMAN && gamePhase === 'playing' && (
              <div className="current-player-indicator">Your Turn</div>
            )}
          </div>
        </div>
        
        <div className="vs">VS</div>
        
        <div className="player ai-player">
          <div className="player-icon">🤖</div>
          <div className="player-details">
            <h3>AI Player</h3>
            <div className="moves-count">Moves: {aiMoves}</div>
            {currentPlayer === AI && gamePhase === 'playing' && (
              <div className="current-player-indicator">AI's Turn</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="game-status">
        <div className="status-message">{statusMessage}</div>
      </div>
      
    </div>
  );
};

export default GameInfo;
