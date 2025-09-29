import { BOARD_SIZE, EMPTY, DIRECTIONS } from './constants';

// Check if position is within board bounds
export const isValidPosition = (row, col) => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Get valid moves for a position
export const getValidMoves = (board, pos) => {
  if (!pos) return [];
  
  const moves = [];
  for (const [dx, dy] of DIRECTIONS) {
    const newRow = pos[0] + dx;
    const newCol = pos[1] + dy;
    
    if (isValidPosition(newRow, newCol) && board[newRow][newCol] === EMPTY) {
      moves.push([newRow, newCol]);
    }
  }
  return moves;
};

// Check if position is surrounded (no valid moves)
export const isSurrounded = (board, pos) => {
  return getValidMoves(board, pos).length === 0;
};

// Create empty board
export const createEmptyBoard = () => {
  return Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY));
};

// Deep clone board
export const cloneBoard = (board) => {
  return board.map(row => [...row]);
};

// Format position for display
export const formatPosition = (pos) => {
  if (!pos) return 'N/A';
  return `(${pos[0]}, ${pos[1]})`;
};

// Calculate win rate percentage
export const calculateWinRate = (wins, total) => {
  if (total === 0) return '0%';
  return Math.round((wins / total) * 100) + '%';
};

// Format time duration
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Check if two positions are equal
export const positionsEqual = (pos1, pos2) => {
  if (!pos1 || !pos2) return false;
  return pos1[0] === pos2[0] && pos1[1] === pos2[1];
};

// Get cell class name based on type and state
export const getCellClassName = (cellType, isHighlighted = false, isHint = false) => {
  let className = 'cell';
  
  switch (cellType) {
    case 'H':
      className += ' human';
      break;
    case 'A':
      className += ' ai';
      break;
    case '_':
      className += ' blocked';
      break;
    default:
      className += ' empty';
  }
  
  if (isHighlighted) className += ' valid-move';
  if (isHint) className += ' hint-move';
  
  return className;
};

// Calculate game phase based on board state
export const calculateGamePhase = (board) => {
  let blockedCells = 0;
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === '_') blockedCells++;
    }
  }
  
  const blockedPercentage = (blockedCells / (BOARD_SIZE * BOARD_SIZE)) * 100;
  
  if (blockedPercentage < 20) return 'opening';
  if (blockedPercentage < 60) return 'midgame';
  return 'endgame';
};

// Validate move
export const isValidMove = (board, fromPos, toPos) => {
  if (!fromPos || !toPos) return false;
  
  // Check if destination is empty
  if (board[toPos[0]][toPos[1]] !== EMPTY) return false;
  
  // Check if it's a valid direction (adjacent)
  const validMoves = getValidMoves(board, fromPos);
  return validMoves.some(move => move[0] === toPos[0] && move[1] === toPos[1]);
};
