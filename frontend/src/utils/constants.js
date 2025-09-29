// Game constants
export const BOARD_SIZE = 7;
export const EMPTY = '.';
export const BLOCKED = '_';
export const HUMAN = 'H';
export const AI = 'A';

// Game phases
export const GAME_PHASES = {
  STARTING: 'starting',
  PLAYING: 'playing',
  ENDED: 'ended'
};

// Players
export const PLAYERS = {
  HUMAN: 'H',
  AI: 'A'
};

// Move directions (8 directions like a chess queen)
export const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],  // orthogonal
  [-1, -1], [-1, 1], [1, -1], [1, 1]  // diagonal
];

// Cell types for styling
export const CELL_TYPES = {
  EMPTY: 'empty',
  HUMAN: 'human',
  AI: 'ai',
  BLOCKED: 'blocked',
  VALID_MOVE: 'valid-move',
  HINT_MOVE: 'hint-move',
  LAST_MOVE: 'last-move'
};

// Game status messages
export const STATUS_MESSAGES = {
  CHOOSE_START: 'Choose your starting position',
  YOUR_TURN: 'Your turn - choose a move',
  AI_THINKING: 'AI is thinking...',
  INVALID_MOVE: 'Invalid move! Choose a valid adjacent cell.',
  HUMAN_WINS: '🎉 You won! The AI is trapped!',
  AI_WINS: '🤖 AI won! You are trapped!',
  GAME_ENDED: 'Game ended!'
};

// API endpoints
export const API_ENDPOINTS = {
  GAME: '/api/game',
  AI: '/api/ai',
  STATS: '/api/stats',
  HEALTH: '/health'
};

// Animation durations (ms)
export const ANIMATIONS = {
  MOVE_DELAY: 300,
  HINT_DURATION: 3000,
  THINKING_DELAY: 500,
  CELL_HOVER: 200
};

// Game limits
export const LIMITS = {
  MAX_GAMES_PER_SESSION: 1000,
  MAX_TRAINING_GAMES: 1000,
  API_TIMEOUT: 10000
};
