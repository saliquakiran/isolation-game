import React, { useState } from 'react';
import GameRules from '../GameRules/GameRules';
import './Header.css';

const Header = () => {
  const [showRules, setShowRules] = useState(false);

  const toggleRules = () => {
    setShowRules(!showRules);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🎮</span>
            Isolation Game
          </h1>
          <p className="app-subtitle">
            AI vs Human - Try to trap the AI or get trapped yourself!
          </p>
          <button className="how-to-play-btn" onClick={toggleRules}>
            📖 How to Play
          </button>
        </div>
      </header>
      <GameRules isOpen={showRules} onClose={() => setShowRules(false)} />
    </>
  );
};

export default Header;
