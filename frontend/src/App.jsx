import React, { useEffect, useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Header from './components/Layout/Header';
import GameInfo from './components/GameInfo/GameInfo';
import GameBoard from './components/GameBoard/GameBoard';
import GameControls from './components/GameControls/GameControls';
import GameStats from './components/GameStats/GameStats';
import './App.css';

// Main App component
const AppContent = () => {
  const { createGame, loadStats, loadAIStatus, error, gameId, isLoading, isUndoing } = useGame();
  const hasInitialized = useRef(false);

  // Initialize app
  useEffect(() => {
    if (hasInitialized.current) return;
    
    console.log('App initialized, loading data...');
    hasInitialized.current = true;
    
    // Load initial data with error handling
    const initializeApp = async () => {
      try {
        await Promise.all([
          loadStats(),
          loadAIStatus()
        ]);
        
        // Only create initial game if one doesn't exist (first app load only)
        // Don't create game if we're in the middle of an undo operation
        if (!gameId && !isUndoing) {
          await createGame();
        }
        console.log('App initialization complete');
      } catch (err) {
        console.error('App initialization failed:', err);
      }
    };
    
    initializeApp();
  }, []); // Empty dependency array - only run once

  // Show error if there's a critical error
  if (error && error.includes('Failed to create game')) {
    return (
      <div className="app">
        <Header />
        <div className="app-content">
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '10px',
            textAlign: 'center',
            margin: '20px',
            border: '2px solid #dc3545'
          }}>
            <h2 style={{ color: '#dc3545' }}>⚠️ Connection Error</h2>
            <p>Unable to connect to the game server.</p>
            <p>Make sure the backend is running on port 3001.</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      
      <div className="app-content">
        <GameInfo />
        <GameBoard />
        <GameControls />
        <GameStats />
      </div>
      
      <footer className="app-footer">
      </footer>
    </div>
  );
};

// App with GameProvider wrapper
const App = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;