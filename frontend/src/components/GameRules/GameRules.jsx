import React from 'react';
import './GameRules.css';

const GameRules = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <h2>How to Play Isolation</h2>
          <button className="rules-close" onClick={onClose}>×</button>
        </div>
        <div className="rules-content">
          <div className="rules-section">
            <p>Be the last player who can make a move. If you can't move, you lose.</p>
          </div>
          
          <div className="rules-section">
            <ol>
              <li>Click "New Game" to start</li>
              <li>Choose your starting position by clicking any empty cell</li>
              <li>The AI will place its starting position automatically</li>
              <li>Players take turns moving</li>
              <li>Move in any direction: up, down, left, right, or diagonally</li>
              <li>Move one cell at a time</li>
              <li>Your previous position becomes blocked</li>
              <li>The game ends when one player cannot make a legal move</li>
            </ol>
          </div>
          
          <div className="rules-section">
            <p>Plan your moves to trap your opponent and control the center of the board. Use the "Get Hint" button if you need help.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRules;
