import React from 'react';
import { useGame } from '../../context/GameContext';
import { calculateWinRate } from '../../utils/helpers';
import './GameStats.css';

const GameStats = () => {
  const { stats } = useGame();

  // Add safety checks for undefined values
  const safeStats = {
    gamesPlayed: stats?.gamesPlayed || 0,
    humanWins: stats?.humanWins || 0,
    aiWins: stats?.aiWins || 0,
    averageGameLength: stats?.averageGameLength || 0
  };

  const humanWinRate = calculateWinRate(safeStats.humanWins, safeStats.gamesPlayed);
  const aiWinRate = calculateWinRate(safeStats.aiWins, safeStats.gamesPlayed);

  return (
    <div className="game-stats">
      <div className="stat-card">
        <h4>Games Played</h4>
        <div className="stat-value">{safeStats.gamesPlayed}</div>
      </div>
      
      <div className="stat-card">
        <h4>Human Wins</h4>
        <div className="stat-value">{safeStats.humanWins}</div>
        <div className="stat-percentage">{humanWinRate}</div>
      </div>
      
      <div className="stat-card">
        <h4>AI Wins</h4>
        <div className="stat-value">{safeStats.aiWins}</div>
        <div className="stat-percentage">{aiWinRate}</div>
      </div>
      
      <div className="stat-card">
        <h4>Avg. Length</h4>
        <div className="stat-value">{safeStats.averageGameLength.toFixed(1)}</div>
        <div className="stat-label">moves</div>
      </div>
    </div>
  );
};

export default GameStats;
