# Isolation Game - AI vs Human

A full-stack web application featuring the classic Isolation game with an AI opponent that learns from gameplay using neural networks and Monte Carlo Tree Search.

## 🎮 How to Play

1. Click any empty cell to place your starting piece
2. Click adjacent cells (orthogonally or diagonally) to move
3. After each move, the cell you left becomes blocked
4. Win by trapping your opponent with no valid moves

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
1. Clone the repository
2. Install backend dependencies:
   ```bash
   cd backend && npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```

## 🎮 How to Run

### Option 1: Development Mode (Recommended)
1. **Start the backend server** (in one terminal):
   ```bash
   cd backend
   npm start
   ```
   The backend will run on http://localhost:3001

2. **Start the frontend development server** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on http://localhost:3000

3. **Open your browser** and go to http://localhost:3000

### Option 2: Production Build
1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend** (serves both API and frontend):
   ```bash
   cd backend
   npm start
   ```

3. **Open your browser** and go to http://localhost:3001

### Quick Start
If you just want to play immediately:
```bash
# Terminal 1 - Backend
cd backend && npm install && npm start

# Terminal 2 - Frontend  
cd frontend && npm install && npm run dev
```
Then open http://localhost:3000 in your browser.

## 🤖 AI Features

- **Neural Network**: 3-layer deep learning model (256→128→64 neurons)
- **MCTS Integration**: Monte Carlo Tree Search with neural network evaluation
- **Experience Replay**: Learns from 10,000+ stored game experiences
- **Pattern Analysis**: Tracks human strategies and adapts counter-strategies
- **Real-time Learning**: Model updates after each game session

## 🎯 Game Features

- **7×7 Grid**: Standard Isolation game board
- **Visual Feedback**: Valid moves highlighted in green
- **Game Controls**: New Game, Undo Move, Get Hint
- **Statistics**: Track games played, wins, and win rate
- **Responsive Design**: Works on desktop and mobile

## 🧠 Technical Architecture

### Backend (Node.js + Express)
- **Game Engine**: Core game logic and state management
- **Neural Network**: TensorFlow.js model for position evaluation
- **Experience Replay**: Learning system with pattern recognition
- **REST API**: Game, AI, and statistics endpoints
- **Data Persistence**: JSON file storage for games and models

### Frontend (React + Vite)
- **Game Context**: Centralized state management
- **Component Architecture**: Modular UI components
- **API Integration**: Axios-based communication with backend
- **Real-time Updates**: Live game state synchronization

### AI Learning System
- **Model Architecture**: 49 input features (7×7 board), 1 output (win probability)
- **Training**: Binary crossentropy loss with Adam optimizer
- **Pattern Recognition**: Human starting positions and move sequences
- **Model Persistence**: Saves trained models to disk

## 🏆 Strategy Tips

1. Control the center early in the game
2. Use moves to limit opponent's options
3. Think ahead about opponent's possible moves
4. Use the hint feature to see AI's suggested move

## 🔧 Development

### Project Structure
```
isolation-game-copy/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Game engine, neural network
│   │   └── server.js       # Express server
│   └── data/               # Game data and models
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── context/        # State management
│   │   └── services/       # API client
└── README.md
```

### Key Technologies
- **Backend**: Node.js, Express, TensorFlow.js
- **Frontend**: React, Vite, Axios
- **AI**: Neural Networks, MCTS, Experience Replay
- **Data**: JSON file storage

## 📊 Performance

- AI response time: ~1 second per move
- Model size: ~1.5MB (neural network weights)
- Memory usage: Optimized for continuous learning
- Browser compatibility: Modern browsers with ES6+ support

## 🎓 Educational Value

This project demonstrates:
- **Machine Learning**: Neural networks for game AI
- **Reinforcement Learning**: Experience replay and pattern recognition
- **Web Development**: Full-stack React/Node.js architecture
- **Game Theory**: Adversarial search with learning opponents

---

**Enjoy playing Isolation against the learning AI!** 🎮🤖