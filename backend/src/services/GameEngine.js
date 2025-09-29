const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const NeuralNetwork = require('./NeuralNetwork');
const ExperienceReplay = require('./ExperienceReplay');

class GameEngine {
    constructor() {
        this.BOARD_SIZE = 7;
        this.EMPTY = '.';
        this.BLOCKED = '_';
        this.HUMAN = 'H';
        this.AI = 'A';
        
        this.directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1],  // orthogonal
            [-1, -1], [-1, 1], [1, -1], [1, 1]  // diagonal
        ];
        
        this.neuralNetwork = null;
        this.experienceReplay = null;
        this.activeGames = new Map(); // Store active games
        this.gameStats = {
            totalGames: 0,
            humanWins: 0,
            aiWins: 0,
            averageGameLength: 0
        };
        this.statsFilePath = path.join(__dirname, '../../data/stats.json');
    }

    async initialize(neuralNetwork) {
        this.neuralNetwork = neuralNetwork;
        this.experienceReplay = new ExperienceReplay();
        
        // Load existing statistics
        await this.loadStats();
        
        // Start cleanup interval to remove old games
        this.startCleanupInterval();
        
        console.log('🎮 Game Engine initialized');
    }

    // Cleanup old games every 5 minutes
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupOldGames();
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Remove games older than 1 hour
    cleanupOldGames() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        let cleanedCount = 0;
        
        for (const [gameId, game] of this.activeGames.entries()) {
            if (game.createdAt < oneHourAgo) {
                this.activeGames.delete(gameId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old games`);
            // Note: We no longer reset stats when cleaning up games
            // Statistics are now persisted and should be preserved
        }
    }

    // Create a new game
    createGame(playerId) {
        const gameId = uuidv4();
        const game = {
            id: gameId,
            playerId: playerId,
            board: this.initializeBoard(),
            humanPos: null,
            aiPos: null,
            currentPlayer: this.HUMAN,
            gamePhase: 'starting', // 'starting', 'playing', 'ended'
            moveHistory: [],
            createdAt: new Date(),
            status: 'active'
        };
        
        this.activeGames.set(gameId, game);
        return game;
    }

    initializeBoard() {
        return Array(this.BOARD_SIZE).fill().map(() => Array(this.BOARD_SIZE).fill(this.EMPTY));
    }

    // Place starting positions
    placeStartingPosition(gameId, row, col) {
        const game = this.activeGames.get(gameId);
        if (!game || game.gamePhase !== 'starting') {
            throw new Error('Invalid game state');
        }

        if (game.board[row][col] !== this.EMPTY) {
            throw new Error('Position already occupied');
        }

        // Place human
        game.board[row][col] = this.HUMAN;
        game.humanPos = [row, col];

        // Place AI at center or adjacent
        const center = [Math.floor(this.BOARD_SIZE / 2), Math.floor(this.BOARD_SIZE / 2)];
        if (game.board[center[0]][center[1]] === this.EMPTY) {
            game.board[center[0]][center[1]] = this.AI;
            game.aiPos = center;
        } else {
            const adjacentMoves = this.getValidMoves(game.board, center);
            if (adjacentMoves.length > 0) {
                const randomMove = adjacentMoves[Math.floor(Math.random() * adjacentMoves.length)];
                game.board[randomMove[0]][randomMove[1]] = this.AI;
                game.aiPos = randomMove;
            }
        }

        game.gamePhase = 'playing';
        game.currentPlayer = this.HUMAN;
        
        return game;
    }

    // Make a human move
    async makeHumanMove(gameId, row, col) {
        const game = this.activeGames.get(gameId);
        if (!game || game.gamePhase !== 'playing' || game.currentPlayer !== this.HUMAN) {
            throw new Error('Invalid move');
        }

        const validMoves = this.getValidMoves(game.board, game.humanPos);
        if (!validMoves.some(move => move[0] === row && move[1] === col)) {
            throw new Error('Invalid move');
        }

        await this.movePlayer(game, this.HUMAN, [row, col], false);
        game.currentPlayer = this.AI;
        
        // Record move for experience replay
        this.experienceReplay.recordMove(gameId, this.HUMAN, [row, col], game.board);
        
        return game;
    }

    // Make AI move using Enhanced MCTS
    async makeAIMove(gameId) {
        const game = this.activeGames.get(gameId);
        if (!game || game.gamePhase !== 'playing' || game.currentPlayer !== this.AI) {
            throw new Error('Invalid AI move');
        }

        const validMoves = this.getValidMoves(game.board, game.aiPos);
        if (validMoves.length === 0) {
            await this.endGame(game, this.HUMAN);
            return game;
        }

        // Enhanced MCTS with Neural Network
        const bestMove = await this.enhancedMCTS(game, validMoves);
        await this.movePlayer(game, this.AI, bestMove, false);
        game.currentPlayer = this.HUMAN;
        
        // Record move for experience replay
        this.experienceReplay.recordMove(gameId, this.AI, bestMove, game.board);
        
        return game;
    }

    // Enhanced MCTS with Neural Network Evaluation
    async enhancedMCTS(game, validMoves) {
        const startTime = Date.now();
        const timeLimit = parseInt(process.env.AI_THINKING_TIME) || 500; // Reduced from 1000ms to 500ms
        const maxSimulations = parseInt(process.env.AI_SIMULATIONS) || 200; // Reduced from 1000 to 200
        
        const scores = {};
        const visits = {};
        
        // Initialize scores and visits for each move
        validMoves.forEach(move => {
            const moveKey = JSON.stringify(move);
            scores[moveKey] = 0;
            visits[moveKey] = 0;
        });

        let simulations = 0;
        
        // Run simulations until time limit or max simulations
        while (Date.now() - startTime < timeLimit && simulations < maxSimulations) {
            // Evaluate each move once per simulation round
            for (const move of validMoves) {
                const moveKey = JSON.stringify(move);
                
                // Create a copy of the game state
                const simGame = this.cloneGame(game);
                
                // Make the move (simulation - don't update stats)
                await this.movePlayer(simGame, this.AI, move, true);
                
                // Evaluate position using neural network
                const evaluation = await this.evaluatePosition(simGame.board);
                
                // Update scores (1 = AI wins, 0 = human wins, 0.5 = draw)
                const aiWinProbability = evaluation;
                scores[moveKey] += aiWinProbability;
                visits[moveKey]++;
                
                simulations++;
                
                // Check time limit more frequently
                if (Date.now() - startTime >= timeLimit) break;
            }
            
            // Early exit if we have enough data
            if (simulations >= maxSimulations) break;
        }

        // Find the move with the best win rate
        let bestMove = validMoves[0];
        let bestScore = 0;
        
        for (const move of validMoves) {
            const moveKey = JSON.stringify(move);
            const winRate = visits[moveKey] > 0 ? scores[moveKey] / visits[moveKey] : 0;
            if (winRate > bestScore) {
                bestScore = winRate;
                bestMove = move;
            }
        }

        console.log(`🤖 AI made move after ${simulations} simulations in ${Date.now() - startTime}ms`);
        return bestMove;
    }

    // Neural Network Position Evaluation
    async evaluatePosition(board) {
        if (!this.neuralNetwork.isLoaded()) {
            // Fallback to simple heuristic if neural network not ready
            return this.heuristicEvaluation(board);
        }
        
        try {
            // Add timeout for neural network evaluation to prevent slow moves
            const evaluationPromise = this.neuralNetwork.evaluatePosition(board);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Neural network timeout')), 50)
            );
            
            return await Promise.race([evaluationPromise, timeoutPromise]);
        } catch (error) {
            console.warn('Neural network evaluation failed or timed out, using heuristic:', error.message);
            return this.heuristicEvaluation(board);
        }
    }

    // Fallback heuristic evaluation
    heuristicEvaluation(board) {
        // Simple heuristic: count available moves for each player
        let humanMoves = 0;
        let aiMoves = 0;
        let humanPos = null;
        let aiPos = null;
        
        // Find player positions
        for (let row = 0; row < this.BOARD_SIZE; row++) {
            for (let col = 0; col < this.BOARD_SIZE; col++) {
                if (board[row][col] === this.HUMAN) humanPos = [row, col];
                if (board[row][col] === this.AI) aiPos = [row, col];
            }
        }
        
        if (humanPos) humanMoves = this.getValidMoves(board, humanPos).length;
        if (aiPos) aiMoves = this.getValidMoves(board, aiPos).length;
        
        // If AI has no moves, human wins (0)
        if (aiMoves === 0) return 0;
        
        // If human has no moves, AI wins (1)
        if (humanMoves === 0) return 1;
        
        // Otherwise, return probability based on move advantage
        const totalMoves = humanMoves + aiMoves;
        return aiMoves / totalMoves;
    }

    // Helper methods
    async movePlayer(game, player, newPos, isSimulation = false) {
        const oldPos = player === this.HUMAN ? game.humanPos : game.aiPos;
        
        // Block the old position
        if (oldPos) {
            game.board[oldPos[0]][oldPos[1]] = this.BLOCKED;
        }
        
        // Move to new position
        game.board[newPos[0]][newPos[1]] = player;
        if (player === this.HUMAN) {
            game.humanPos = newPos;
        } else {
            game.aiPos = newPos;
        }
        
        // Add to move history
        game.moveHistory.push({
            player: player,
            from: oldPos,
            to: newPos,
            timestamp: new Date(),
            board: JSON.parse(JSON.stringify(game.board))
        });
        
        // Check for game end (but don't update stats for simulations)
        if (isSimulation) {
            await this.checkGameEndSimulation(game);
        } else {
            await this.checkGameEnd(game);
        }
    }

    getValidMoves(board, pos) {
        const moves = [];
        for (const [dx, dy] of this.directions) {
            const newRow = pos[0] + dx;
            const newCol = pos[1] + dy;
            
            if (this.isValidPosition(newRow, newCol) && board[newRow][newCol] === this.EMPTY) {
                moves.push([newRow, newCol]);
            }
        }
        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE;
    }

    async checkGameEnd(game) {
        const humanMoves = this.getValidMoves(game.board, game.humanPos);
        const aiMoves = this.getValidMoves(game.board, game.aiPos);
        
        if (humanMoves.length === 0) {
            await this.endGame(game, this.AI);
        } else if (aiMoves.length === 0) {
            await this.endGame(game, this.HUMAN);
        }
    }

    // Check game end for simulations (no statistics update)
    async checkGameEndSimulation(game) {
        const humanMoves = this.getValidMoves(game.board, game.humanPos);
        const aiMoves = this.getValidMoves(game.board, game.aiPos);
        
        if (humanMoves.length === 0) {
            game.gamePhase = 'ended';
            game.winner = this.AI;
        } else if (aiMoves.length === 0) {
            game.gamePhase = 'ended';
            game.winner = this.HUMAN;
        }
    }

    async endGame(game, winner) {
        console.log(`🏁 endGame called for game ${game.id}, winner: ${winner}`);
        game.gamePhase = 'ended';
        game.winner = winner;
        game.endedAt = new Date();
        console.log(`🏁 Game phase set to: ${game.gamePhase}, winner set to: ${game.winner}`);
        
        // Skip statistics update for simulations
        if (!game.isSimulation) {
            // Update stats
            this.gameStats.totalGames++;
            if (winner === this.HUMAN) {
                this.gameStats.humanWins++;
            } else {
                this.gameStats.aiWins++;
            }
            
            // Calculate average game length
            const gameLength = game.moveHistory.length;
            this.gameStats.averageGameLength = 
                (this.gameStats.averageGameLength * (this.gameStats.totalGames - 1) + gameLength) / 
                this.gameStats.totalGames;
            
            // Record complete game for experience replay
            this.experienceReplay.recordGame(game);
            
            // Save updated statistics
            await this.saveStats();
            
            console.log(`🎯 Game ${game.id} ended. Winner: ${winner === this.HUMAN ? 'Human' : 'AI'}`);
        }
    }

    cloneGame(game) {
        return {
            ...game,
            id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID for simulation
            board: JSON.parse(JSON.stringify(game.board)),
            humanPos: game.humanPos ? [...game.humanPos] : null,
            aiPos: game.aiPos ? [...game.aiPos] : null,
            moveHistory: [...game.moveHistory],
            isSimulation: true // Mark as simulation
        };
    }

    // Get game by ID
    getGame(gameId) {
        return this.activeGames.get(gameId);
    }

    // Get game stats
    getStats() {
        return {
            ...this.gameStats,
            winRate: this.gameStats.totalGames > 0 
                ? (this.gameStats.humanWins / this.gameStats.totalGames * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    // Load statistics from file
    async loadStats() {
        try {
            const data = await fs.readFile(this.statsFilePath, 'utf8');
            const savedStats = JSON.parse(data);
            this.gameStats = {
                totalGames: savedStats.totalGames || 0,
                humanWins: savedStats.humanWins || 0,
                aiWins: savedStats.aiWins || 0,
                averageGameLength: savedStats.averageGameLength || 0
            };
            console.log('📊 Loaded existing statistics:', this.gameStats);
        } catch (error) {
            // File doesn't exist or is invalid, start with default stats
            console.log('📊 No existing statistics found, starting fresh');
            this.gameStats = {
                totalGames: 0,
                humanWins: 0,
                aiWins: 0,
                averageGameLength: 0
            };
        }
    }

    // Save statistics to file
    async saveStats() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.statsFilePath);
            await fs.mkdir(dataDir, { recursive: true });
            
            // Save statistics
            await fs.writeFile(this.statsFilePath, JSON.stringify(this.gameStats, null, 2));
            console.log('📊 Statistics saved to file');
        } catch (error) {
            console.error('Failed to save statistics:', error);
        }
    }

    // Reset game statistics to zero
    async resetStats() {
        this.gameStats = {
            totalGames: 0,
            humanWins: 0,
            aiWins: 0,
            averageGameLength: 0
        };
        
        // Save the reset statistics
        await this.saveStats();
        
        console.log('📊 Game statistics reset to zero');
        return this.gameStats;
    }

    // Undo last move (only human's last move and subsequent AI moves)
    async undoLastMove(gameId) {
        const game = this.activeGames.get(gameId);
        
        if (!game) {
            throw new Error('Game not found');
        }
        
        if (game.gamePhase === 'ended') {
            throw new Error('Cannot undo moves in ended game');
        }
        
        if (game.moveHistory.length === 0) {
            throw new Error('No moves to undo');
        }
        
        // Find the last human move (not AI move)
        let lastHumanMoveIndex = -1;
        for (let i = game.moveHistory.length - 1; i >= 0; i--) {
            if (game.moveHistory[i].player === this.HUMAN) {
                lastHumanMoveIndex = i;
                break;
            }
        }
        
        if (lastHumanMoveIndex === -1) {
            throw new Error('No human moves to undo');
        }
        
        // Get the last human move before removing it
        const lastHumanMove = game.moveHistory[lastHumanMoveIndex];
        
        // Remove all moves after the last human move (including AI moves)
        const movesToRemove = game.moveHistory.length - lastHumanMoveIndex;
        for (let i = 0; i < movesToRemove; i++) {
            game.moveHistory.pop();
        }
        
        // Remove the last human move as well
        game.moveHistory.pop();
        
        // If this was the first move (starting position), reset to starting phase
        if (game.moveHistory.length === 0) {
            // Reset to starting phase
            game.gamePhase = 'starting';
            game.currentPlayer = this.HUMAN;
            game.humanPos = null;
            game.aiPos = null;
            game.winner = null;
            
            // Reset board to completely empty state (no blocked cells initially)
            game.board = this.initializeBoard();
        } else {
            // Revert the board state by removing the last human move
            const { from, to, player } = lastHumanMove;
            
            // Clear the destination
            game.board[to[0]][to[1]] = this.EMPTY;
            
            // Restore the source position (if it exists)
            if (from) {
                game.board[from[0]][from[1]] = player;
            }
            
            // Update human position
            game.humanPos = from;
            
            // Set current player to human (since they're undoing their move)
            game.currentPlayer = this.HUMAN;
            
            // If we're back to just the starting position (one move in history),
            // it should always be human's turn since they place first
            if (game.moveHistory.length === 1) {
                game.currentPlayer = this.HUMAN;
            }
        }
        
        console.log(`↶ Undid last move in game ${gameId}. Move history length: ${game.moveHistory.length}`);
        console.log(`Current board state:`, game.board);
        console.log(`Human pos: ${game.humanPos}, AI pos: ${game.aiPos}`);
        return game;
    }
}

module.exports = GameEngine;
