import axios from 'axios';

// Determine API URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://isolation-gamebackend-production.up.railway.app' : 'http://localhost:3001');

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔧 Environment:', import.meta.env.MODE);
console.log('📦 VITE_API_URL:', import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Game API
export const gameAPI = {
  // Create new game
  createGame: (playerId) => api.post('/api/game/create', { playerId }),
  
  // Start game with initial position
  startGame: (gameId, row, col) => api.post(`/api/game/${gameId}/start`, { row, col }),
  
  // Make a move
  makeMove: (gameId, row, col) => api.post(`/api/game/${gameId}/move`, { row, col }),
  
  // Make AI move
  makeAIMove: (gameId) => api.post(`/api/game/${gameId}/ai-move`),
  
  // Get game state
  getGame: (gameId) => api.get(`/api/game/${gameId}`),
  
  // Get valid moves
  getValidMoves: (gameId) => api.get(`/api/game/${gameId}/valid-moves`),
  
  // Get game stats
  getStats: () => api.get('/api/game/stats/overview'),
  
  // Get move history
  getMoveHistory: (gameId) => api.get(`/api/game/${gameId}/history`),
  
  // Undo last move
  undoMove: (gameId) => api.post(`/api/game/${gameId}/undo`),
};

// AI API
export const aiAPI = {
  // Get AI status
  getStatus: () => api.get('/api/ai/status'),
  
  // Evaluate position
  evaluatePosition: (board) => api.post('/api/ai/evaluate', { board }),
  
  // Get move suggestion
  suggestMove: (gameId) => api.post('/api/ai/suggest-move', { gameId }),
  
  // Get AI performance
  getPerformance: () => api.get('/api/ai/performance'),
  
  // Get AI insights
  getInsights: () => api.get('/api/ai/insights'),
};

// Stats API
export const statsAPI = {
  // Get overview stats (personal game stats)
  getOverview: () => api.get('/api/game/stats/overview'),
  
  // Get detailed game stats
  getGames: () => api.get('/api/stats/games'),
  
  // Get AI performance stats
  getAIPerformance: () => api.get('/api/stats/ai-performance'),
  
  // Get human insights
  getHumanInsights: () => api.get('/api/stats/human-insights'),
  
  // Get training stats
  getTraining: () => api.get('/api/stats/training'),
  
  // Get system health
  getSystemHealth: () => api.get('/api/stats/system-health'),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
