import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { gameAPI, aiAPI, statsAPI } from '../services/api';
import { GAME_PHASES, PLAYERS, STATUS_MESSAGES } from '../utils/constants';
import { getValidMoves } from '../utils/helpers';
import confetti from 'canvas-confetti';

// Initial state
const initialState = {
  // Game state
  game: null,
  gameId: null,
  board: null,
  humanPos: null,
  aiPos: null,
  currentPlayer: PLAYERS.HUMAN,
  gamePhase: GAME_PHASES.STARTING,
  winner: null,
  moveHistory: [],
  
  // UI state
  isLoading: false,
  isThinking: false,
  isUndoing: false,
  error: null,
  statusMessage: STATUS_MESSAGES.CHOOSE_START,
  
  // Game data
  validMoves: [],
  hintMove: null,
  lastMove: null,
  showValidMoves: false, // For click-to-highlight functionality
  
  // Statistics
  stats: {
    gamesPlayed: 0,
    humanWins: 0,
    aiWins: 0,
    winRate: '0%',
    averageGameLength: 0,
    activeGames: 0
  },
  
  // AI data
  aiStatus: {
    status: 'loading',
    model: null,
    gameStats: {}
  }
};

// Action types
const ActionTypes = {
  // Game actions
  SET_GAME: 'SET_GAME',
  SET_BOARD: 'SET_BOARD',
  SET_POSITIONS: 'SET_POSITIONS',
  SET_CURRENT_PLAYER: 'SET_CURRENT_PLAYER',
  SET_GAME_PHASE: 'SET_GAME_PHASE',
  SET_WINNER: 'SET_WINNER',
  SET_MOVE_HISTORY: 'SET_MOVE_HISTORY',
  ADD_MOVE: 'ADD_MOVE',
  
  // UI actions
  SET_LOADING: 'SET_LOADING',
  SET_THINKING: 'SET_THINKING',
  SET_UNDOING: 'SET_UNDOING',
  SET_ERROR: 'SET_ERROR',
  SET_STATUS_MESSAGE: 'SET_STATUS_MESSAGE',
  SET_VALID_MOVES: 'SET_VALID_MOVES',
  SET_HINT_MOVE: 'SET_HINT_MOVE',
  SET_LAST_MOVE: 'SET_LAST_MOVE',
  CLEAR_HINT: 'CLEAR_HINT',
  TOGGLE_VALID_MOVES: 'TOGGLE_VALID_MOVES',
  CLEAR_VALID_MOVES_HIGHLIGHT: 'CLEAR_VALID_MOVES_HIGHLIGHT',
  
  // Stats actions
  SET_STATS: 'SET_STATS',
  UPDATE_STATS: 'UPDATE_STATS',
  
  // AI actions
  SET_AI_STATUS: 'SET_AI_STATUS',
  
  // Game control actions
  NEW_GAME: 'NEW_GAME',
  RESET_GAME: 'RESET_GAME'
};

// Reducer
const gameReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_GAME:
      console.log('🎮 SET_GAME action:', action.payload);
      console.log('Game phase:', action.payload?.gamePhase);
      console.log('Winner:', action.payload?.winner);
      
      const newState = {
        ...state,
        game: action.payload,
        gameId: action.payload?.id || null,
        board: action.payload?.board || null,
        humanPos: action.payload?.humanPos || null,
        aiPos: action.payload?.aiPos || null,
        currentPlayer: action.payload?.currentPlayer || PLAYERS.HUMAN,
        gamePhase: action.payload?.gamePhase || GAME_PHASES.STARTING,
        winner: action.payload?.winner || null,
        moveHistory: action.payload?.moveHistory || []
      };
      
      // Set appropriate status message when game ends
      if (action.payload?.gamePhase === GAME_PHASES.ENDED && action.payload?.winner) {
        console.log('🎉 Game ended! Setting win message for winner:', action.payload.winner);
        if (action.payload.winner === PLAYERS.HUMAN) {
          newState.statusMessage = STATUS_MESSAGES.HUMAN_WINS;
          console.log('Set status message to:', STATUS_MESSAGES.HUMAN_WINS);
          // Trigger confetti for human win
          triggerConfetti();
        } else if (action.payload.winner === PLAYERS.AI) {
          newState.statusMessage = STATUS_MESSAGES.AI_WINS;
          console.log('Set status message to:', STATUS_MESSAGES.AI_WINS);
          // Trigger screen shake for AI win
          addShakeStyles();
          triggerScreenShake();
        } else {
          newState.statusMessage = STATUS_MESSAGES.GAME_ENDED;
          console.log('Set status message to:', STATUS_MESSAGES.GAME_ENDED);
        }
      }
      
      console.log('Final newState statusMessage:', newState.statusMessage);
      return newState;
      
    case ActionTypes.SET_BOARD:
      return {
        ...state,
        board: action.payload
      };
      
    case ActionTypes.SET_POSITIONS:
      return {
        ...state,
        humanPos: action.payload.humanPos,
        aiPos: action.payload.aiPos
      };
      
    case ActionTypes.SET_CURRENT_PLAYER:
      return {
        ...state,
        currentPlayer: action.payload
      };
      
    case ActionTypes.SET_GAME_PHASE:
      return {
        ...state,
        gamePhase: action.payload
      };
      
    case ActionTypes.SET_WINNER:
      const winnerState = {
        ...state,
        winner: action.payload,
        gamePhase: GAME_PHASES.ENDED
      };
      
      // Set appropriate status message when winner is set
      if (action.payload === PLAYERS.HUMAN) {
        winnerState.statusMessage = STATUS_MESSAGES.HUMAN_WINS;
        // Trigger confetti for human win
        triggerConfetti();
      } else if (action.payload === PLAYERS.AI) {
        winnerState.statusMessage = STATUS_MESSAGES.AI_WINS;
        // Trigger screen shake for AI win
        addShakeStyles();
        triggerScreenShake();
      } else {
        winnerState.statusMessage = STATUS_MESSAGES.GAME_ENDED;
      }
      
      return winnerState;
      
    case ActionTypes.SET_MOVE_HISTORY:
      return {
        ...state,
        moveHistory: action.payload
      };
      
    case ActionTypes.ADD_MOVE:
      return {
        ...state,
        moveHistory: [...state.moveHistory, action.payload]
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case ActionTypes.SET_THINKING:
      return {
        ...state,
        isThinking: action.payload
      };
      
    case ActionTypes.SET_UNDOING:
      return {
        ...state,
        isUndoing: action.payload
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isThinking: false
      };
      
    case ActionTypes.SET_STATUS_MESSAGE:
      return {
        ...state,
        statusMessage: action.payload
      };
      
    case ActionTypes.SET_VALID_MOVES:
      return {
        ...state,
        validMoves: action.payload
      };
      
    case ActionTypes.SET_HINT_MOVE:
      return {
        ...state,
        hintMove: action.payload
      };
      
    case ActionTypes.SET_LAST_MOVE:
      return {
        ...state,
        lastMove: action.payload
      };
      
    case ActionTypes.CLEAR_HINT:
      return {
        ...state,
        hintMove: null
      };
      
    case ActionTypes.TOGGLE_VALID_MOVES:
      return {
        ...state,
        showValidMoves: !state.showValidMoves
      };
      
    case ActionTypes.CLEAR_VALID_MOVES_HIGHLIGHT:
      return {
        ...state,
        showValidMoves: false
      };
      
    case ActionTypes.SET_STATS:
      return {
        ...state,
        stats: action.payload
      };
      
    case ActionTypes.UPDATE_STATS:
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };
      
    case ActionTypes.SET_AI_STATUS:
      return {
        ...state,
        aiStatus: action.payload
      };
      
    case ActionTypes.NEW_GAME:
      return {
        ...state,
        game: null,
        gameId: null,
        board: null,
        humanPos: null,
        aiPos: null,
        currentPlayer: PLAYERS.HUMAN,
        gamePhase: GAME_PHASES.STARTING,
        winner: null,
        moveHistory: [],
        validMoves: [],
        hintMove: null,
        lastMove: null,
        error: null,
        statusMessage: STATUS_MESSAGES.CHOOSE_START,
        isLoading: false,
        isThinking: false,
        isUndoing: false
      };
      
    case ActionTypes.RESET_GAME:
      return {
        ...initialState,
        stats: state.stats,
        aiStatus: state.aiStatus
      };
      
    default:
      return state;
  }
};

// Confetti function for human wins
const triggerConfetti = () => {
  // Create multiple confetti bursts
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Fire confetti from different positions
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

// Screen shake function for AI wins
const triggerScreenShake = () => {
  const body = document.body;
  const originalTransform = body.style.transform;
  
  // Add shake animation class
  body.style.animation = 'screenShake 0.5s ease-in-out';
  
  // Create "Oops" and "Better luck next time" text overlays
  const oopsDiv = document.createElement('div');
  oopsDiv.textContent = 'Oops!';
  oopsDiv.style.cssText = `
    position: fixed;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 4rem;
    font-weight: bold;
    color: #ff4444;
    z-index: 10000;
    pointer-events: none;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    animation: oopsFade 1s ease-out forwards;
  `;
  
  const betterLuckDiv = document.createElement('div');
  betterLuckDiv.textContent = 'Better luck next time!';
  betterLuckDiv.style.cssText = `
    position: fixed;
    top: 60%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    font-weight: bold;
    color: #ff6666;
    z-index: 10000;
    pointer-events: none;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    animation: oopsFade 2s ease-out 0.5s forwards;
  `;
  
  document.body.appendChild(oopsDiv);
  document.body.appendChild(betterLuckDiv);
  
  // Remove shake animation after it completes
  setTimeout(() => {
    body.style.animation = '';
    body.style.transform = originalTransform;
  }, 500);
  
  // Remove "Oops" text after animation
  setTimeout(() => {
    if (oopsDiv.parentNode) {
      oopsDiv.parentNode.removeChild(oopsDiv);
    }
  }, 1000);
  
  // Remove "Better luck next time" text after animation
  setTimeout(() => {
    if (betterLuckDiv.parentNode) {
      betterLuckDiv.parentNode.removeChild(betterLuckDiv);
    }
  }, 2500);
};

// Add CSS animations for screen shake and oops text
const addShakeStyles = () => {
  if (document.getElementById('shake-styles')) return; // Don't add twice
  
  const style = document.createElement('style');
  style.id = 'shake-styles';
  style.textContent = `
    @keyframes screenShake {
      0%, 100% { transform: translateX(0); }
      10% { transform: translateX(-5px) rotate(-1deg); }
      20% { transform: translateX(5px) rotate(1deg); }
      30% { transform: translateX(-5px) rotate(-1deg); }
      40% { transform: translateX(5px) rotate(1deg); }
      50% { transform: translateX(-5px) rotate(-1deg); }
      60% { transform: translateX(5px) rotate(1deg); }
      70% { transform: translateX(-5px) rotate(-1deg); }
      80% { transform: translateX(5px) rotate(1deg); }
      90% { transform: translateX(-5px) rotate(-1deg); }
    }
    
    @keyframes oopsFade {
      0% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(0.5);
      }
      20% { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1.2);
      }
      100% { 
        opacity: 0; 
        transform: translate(-50%, -50%) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
};

// Context
const GameContext = createContext();

// Provider component
export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Load initial data
  useEffect(() => {
    console.log('GameContext: Loading initial data...');
    loadStats();
    loadAIStatus();
  }, []); // Empty dependency array to run only once
  
  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      console.log('Loading stats...');
      const response = await statsAPI.getOverview();
      console.log('Stats response:', response.data);
      if (response.data.success) {
        // Map the API response to our expected format
        const apiStats = response.data.stats;
        const mappedStats = {
          gamesPlayed: apiStats.totalGames || 0,
          humanWins: apiStats.humanWins || 0,
          aiWins: apiStats.aiWins || 0,
          winRate: apiStats.winRate || '0%',
          averageGameLength: apiStats.averageGameLength || 0
        };
        
        console.log('Mapped stats:', mappedStats);
        dispatch({
          type: ActionTypes.SET_STATS,
          payload: mappedStats
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);
  
  // Load AI status
  const loadAIStatus = useCallback(async () => {
    try {
      const response = await aiAPI.getStatus();
      if (response.data.success) {
        dispatch({
          type: ActionTypes.SET_AI_STATUS,
          payload: response.data.ai
        });
      }
    } catch (error) {
      console.error('Failed to load AI status:', error);
    }
  }, []);
  
  // Create new game
  const createGame = useCallback(async () => {
    // Prevent multiple simultaneous game creation
    if (state.isLoading) {
      console.log('Game creation already in progress, skipping...');
      return;
    }

    try {
      console.log('Creating new game...');
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });

      const response = await gameAPI.createGame();
      console.log('Game creation response:', response.data);

      if (response.data.success) {
        dispatch({
          type: ActionTypes.SET_GAME,
          payload: response.data.game
        });
        dispatch({
          type: ActionTypes.SET_STATUS_MESSAGE,
          payload: STATUS_MESSAGES.CHOOSE_START
        });
        console.log('Game created successfully');
      } else {
        throw new Error(response.data.error || 'Game creation failed');
      }
    } catch (error) {
      console.error('Game creation error:', error);
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: error.response?.data?.error || error.message || 'Failed to create game'
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []); // Remove state.isLoading dependency to prevent recreation
  
  // Start game with initial position
  const startGame = async (row, col) => {
    if (!state.gameId) return;
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
      
      const response = await gameAPI.startGame(state.gameId, row, col);
      if (response.data.success) {
        dispatch({
          type: ActionTypes.SET_GAME,
          payload: response.data.game
        });
        dispatch({
          type: ActionTypes.SET_STATUS_MESSAGE,
          payload: STATUS_MESSAGES.YOUR_TURN
        });
        loadStats(); // Refresh stats
      }
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: error.response?.data?.error || 'Failed to start game'
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };
  
  // Make a move
  const makeMove = async (row, col) => {
    if (!state.gameId || state.currentPlayer !== PLAYERS.HUMAN) return;
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
      
      const response = await gameAPI.makeMove(state.gameId, row, col);
      if (response.data.success) {
        console.log('🎯 Move response:', response.data.game);
        console.log('Game phase:', response.data.game.gamePhase);
        console.log('Winner:', response.data.game.winner);
        console.log('Current player:', response.data.game.currentPlayer);
        
        dispatch({
          type: ActionTypes.SET_GAME,
          payload: response.data.game
        });
        
        // Clear valid moves highlighting after move
        dispatch({ type: ActionTypes.CLEAR_VALID_MOVES_HIGHLIGHT });
        
        if (response.data.game.gamePhase === GAME_PHASES.ENDED) {
          console.log('Game ended, not setting turn message');
        } else if (response.data.game.currentPlayer === PLAYERS.AI) {
          console.log('AI turn next, setting thinking status');
          dispatch({ type: ActionTypes.SET_THINKING, payload: true });
          dispatch({
            type: ActionTypes.SET_STATUS_MESSAGE,
            payload: STATUS_MESSAGES.AI_THINKING
          });
          
          // Make AI move immediately
          try {
            const aiResponse = await gameAPI.makeAIMove(state.gameId);
            if (aiResponse.data.success) {
              console.log('🤖 AI move response:', aiResponse.data.game);
              dispatch({
                type: ActionTypes.SET_GAME,
                payload: aiResponse.data.game
              });
              dispatch({ type: ActionTypes.SET_THINKING, payload: false });
              
              if (aiResponse.data.game.gamePhase !== GAME_PHASES.ENDED) {
                dispatch({
                  type: ActionTypes.SET_STATUS_MESSAGE,
                  payload: STATUS_MESSAGES.YOUR_TURN
                });
              }
              loadStats(); // Refresh stats
            }
          } catch (error) {
            console.error('AI move error:', error);
            dispatch({ type: ActionTypes.SET_THINKING, payload: false });
            dispatch({
              type: ActionTypes.SET_ERROR,
              payload: error.response?.data?.error || 'AI move failed'
            });
          }
        } else {
          console.log('Setting YOUR_TURN message');
          dispatch({
            type: ActionTypes.SET_STATUS_MESSAGE,
            payload: STATUS_MESSAGES.YOUR_TURN
          });
        }
        loadStats(); // Refresh stats
      }
    } catch (error) {
      dispatch({
        type: ActionTypes.SET_STATUS_MESSAGE,
        payload: STATUS_MESSAGES.INVALID_MOVE
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };
  
  // Get hint move
  const getHint = async () => {
    if (!state.gameId || state.currentPlayer !== PLAYERS.HUMAN) return;
    
    try {
      const response = await aiAPI.suggestMove(state.gameId);
      if (response.data.success && response.data.suggestedMove) {
        dispatch({
          type: ActionTypes.SET_HINT_MOVE,
          payload: response.data.suggestedMove.position
        });
        dispatch({
          type: ActionTypes.SET_STATUS_MESSAGE,
          payload: '💡 Hint: Try the highlighted move!'
        });
        
        // Clear hint after 3 seconds
        setTimeout(() => {
          dispatch({ type: ActionTypes.CLEAR_HINT });
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to get hint:', error);
    }
  };
  
  // Calculate and set valid moves when game state changes
  useEffect(() => {
    if (state.gamePhase === GAME_PHASES.PLAYING && 
        state.currentPlayer === PLAYERS.HUMAN && 
        state.board && 
        state.humanPos) {
      const validMoves = getValidMoves(state.board, state.humanPos);
      dispatch({
        type: ActionTypes.SET_VALID_MOVES,
        payload: validMoves
      });
    } else {
      dispatch({
        type: ActionTypes.SET_VALID_MOVES,
        payload: []
      });
    }
  }, [state.gamePhase, state.currentPlayer, state.board, state.humanPos]);

  // Toggle valid moves highlight when clicking on human piece
  const toggleValidMovesHighlight = useCallback(() => {
    if (state.gamePhase === GAME_PHASES.PLAYING && state.currentPlayer === PLAYERS.HUMAN) {
      dispatch({ type: ActionTypes.TOGGLE_VALID_MOVES });
    }
  }, [state.gamePhase, state.currentPlayer]);
  
  // Clear valid moves highlight
  const clearValidMovesHighlight = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_VALID_MOVES_HIGHLIGHT });
  }, []);
  
  // New game
  const newGame = useCallback(async () => {
    dispatch({ type: ActionTypes.NEW_GAME });
    await createGame();
  }, [createGame]);
  
  // Reset game
  const resetGame = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_GAME });
  }, []);
  
  // Undo last move
  const undoMove = useCallback(async () => {
    console.log('🔄 Undo move called, gameId:', state.gameId);
    console.log('Current move history length:', state.moveHistory?.length);
    
    if (!state.gameId) {
      console.log('❌ No game ID, cannot undo');
      return;
    }
    
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.SET_UNDOING, payload: true });
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
      
      console.log('📡 Calling undo API...');
      const response = await gameAPI.undoMove(state.gameId);
      console.log('✅ Undo response:', response.data);
      
      if (response.data.success) {
        console.log('🎯 Updating game state with:', response.data.game);
        dispatch({
          type: ActionTypes.SET_GAME,
          payload: response.data.game
        });
        
        // Clear valid moves highlighting after move
        dispatch({ type: ActionTypes.CLEAR_VALID_MOVES_HIGHLIGHT });
        
        // Set appropriate status message
        if (response.data.game.gamePhase === GAME_PHASES.STARTING) {
          dispatch({
            type: ActionTypes.SET_STATUS_MESSAGE,
            payload: STATUS_MESSAGES.CHOOSE_START
          });
        } else {
          dispatch({
            type: ActionTypes.SET_STATUS_MESSAGE,
            payload: STATUS_MESSAGES.YOUR_TURN
          });
        }
      } else {
        console.log('❌ Undo failed:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Undo error:', error);
      dispatch({
        type: ActionTypes.SET_STATUS_MESSAGE,
        payload: error.response?.data?.error || 'Failed to undo move'
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      dispatch({ type: ActionTypes.SET_UNDOING, payload: false });
    }
  }, [state.gameId, state.moveHistory]);
  
  // Context value
  const value = {
    ...state,
    createGame,
    startGame,
    makeMove,
    getHint,
    undoMove,
    newGame,
    resetGame,
    loadStats,
    loadAIStatus,
    toggleValidMovesHighlight,
    clearValidMovesHighlight
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook to use game context
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Export the context for direct use if needed
export { GameContext };
