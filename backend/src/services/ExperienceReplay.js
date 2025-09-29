const fs = require('fs').promises;
const path = require('path');

class ExperienceReplay {
    constructor() {
        this.experienceBuffer = [];
        this.maxBufferSize = 10000; // Maximum number of experiences to store
        this.gameDataPath = './data/games/';
        this.patternsPath = './data/patterns/';
        
        // Human strategy patterns we're tracking
        this.humanPatterns = {
            startingPositions: new Map(), // Where humans like to start
            movePreferences: new Map(),   // Common move sequences
            trapAttempts: new Map(),      // Human trapping strategies
            escapePatterns: new Map()     // How humans escape traps
        };
        
        console.log('🧠 Experience Replay initialized');
    }

    // Record a single move during gameplay
    recordMove(gameId, player, move, board) {
        const experience = {
            gameId,
            player,
            move,
            board: JSON.parse(JSON.stringify(board)),
            timestamp: new Date(),
            phase: this.determineGamePhase(board)
        };
        
        // Add to buffer
        this.experienceBuffer.push(experience);
        
        // Maintain buffer size
        if (this.experienceBuffer.length > this.maxBufferSize) {
            this.experienceBuffer.shift();
        }
        
        // Analyze human patterns in real-time
        if (player === 'H') {
            this.analyzeHumanPattern(experience);
        }
    }

    // Record complete game for analysis
    async recordGame(game) {
        const gameData = {
            id: game.id,
            playerId: game.playerId,
            moves: game.moveHistory,
            winner: game.winner,
            gameLength: game.moveHistory.length,
            createdAt: game.createdAt,
            endedAt: game.endedAt,
            finalBoard: game.board
        };
        
        // Save game data to file
        await this.saveGameData(gameData);
        
        // Analyze complete game for patterns
        await this.analyzeGamePatterns(gameData);
        
        console.log(`📊 Recorded game ${game.id} with ${game.moveHistory.length} moves`);
    }

    // Determine game phase for context
    determineGamePhase(board) {
        let emptyCells = 0;
        let blockedCells = 0;
        
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (board[row][col] === '.') emptyCells++;
                if (board[row][col] === '_') blockedCells++;
            }
        }
        
        const totalCells = 49;
        const blockedPercentage = (blockedCells / totalCells) * 100;
        
        if (blockedPercentage < 20) return 'opening';
        if (blockedPercentage < 60) return 'midgame';
        return 'endgame';
    }

    // Analyze human playing patterns
    analyzeHumanPattern(experience) {
        const { player, move, board, phase } = experience;
        
        if (player !== 'H') return;
        
        // Track starting positions
        if (phase === 'opening' && this.isStartingMove(move, board)) {
            const key = `${move[0]},${move[1]}`;
            this.humanPatterns.startingPositions.set(
                key, 
                (this.humanPatterns.startingPositions.get(key) || 0) + 1
            );
        }
        
        // Track move preferences in different phases
        const moveKey = this.encodeMovePattern(move, board);
        this.humanPatterns.movePreferences.set(
            moveKey,
            (this.humanPatterns.movePreferences.get(moveKey) || 0) + 1
        );
        
        // Detect trap attempts
        if (this.isTrapAttempt(move, board)) {
            const trapKey = this.encodeTrapPattern(move, board);
            this.humanPatterns.trapAttempts.set(
                trapKey,
                (this.humanPatterns.trapAttempts.get(trapKey) || 0) + 1
            );
        }
    }

    // Analyze complete game for strategic patterns
    async analyzeGamePatterns(gameData) {
        const { moves, winner } = gameData;
        
        // Analyze winning strategies
        if (winner === 'H') {
            this.analyzeWinningHumanStrategy(moves);
        } else if (winner === 'A') {
            this.analyzeLosingHumanStrategy(moves);
        }
        
        // Save patterns periodically
        if (Math.random() < 0.1) { // 10% chance
            await this.savePatterns();
        }
    }

    // Analyze what humans do when they win
    analyzeWinningHumanStrategy(moves) {
        const humanMoves = moves.filter(move => move.player === 'H');
        
        // Look for common patterns in winning games
        for (let i = 0; i < humanMoves.length - 2; i++) {
            const sequence = humanMoves.slice(i, i + 3).map(m => `${m.to[0]},${m.to[1]}`);
            const key = sequence.join('->');
            
            // Track winning move sequences
            this.humanPatterns.movePreferences.set(
                `winning_sequence_${key}`,
                (this.humanPatterns.movePreferences.get(`winning_sequence_${key}`) || 0) + 1
            );
        }
    }

    // Analyze what humans do when they lose
    analyzeLosingHumanStrategy(moves) {
        const humanMoves = moves.filter(move => move.player === 'H');
        
        // Look for mistakes in losing games
        for (let i = 0; i < humanMoves.length - 1; i++) {
            const move = humanMoves[i];
            const nextMove = humanMoves[i + 1];
            
            // Check if move led to being trapped
            if (this.ledToTrap(move, nextMove)) {
                const mistakeKey = `mistake_${move.to[0]},${move.to[1]}`;
                this.humanPatterns.movePreferences.set(
                    mistakeKey,
                    (this.humanPatterns.movePreferences.get(mistakeKey) || 0) + 1
                );
            }
        }
    }

    // Helper methods for pattern analysis
    isStartingMove(move, board) {
        let pieceCount = 0;
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (board[row][col] === 'H' || board[row][col] === 'A') {
                    pieceCount++;
                }
            }
        }
        return pieceCount <= 2; // Early in game
    }

    encodeMovePattern(move, board) {
        // Encode move context: position, available moves, phase
        const [row, col] = move;
        const centerDistance = Math.abs(row - 3) + Math.abs(col - 3);
        const phase = this.determineGamePhase(board);
        
        return `${phase}_${centerDistance}_${row},${col}`;
    }

    isTrapAttempt(move, board) {
        // Simple heuristic: moving to corner or edge when AI is nearby
        const [row, col] = move;
        const isEdge = row === 0 || row === 6 || col === 0 || col === 6;
        
        // Check if AI is nearby (within 2 squares)
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (board[r][c] === 'A') {
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= 2) return true;
                }
            }
        }
        
        return false;
    }

    encodeTrapPattern(move, board) {
        const [row, col] = move;
        return `trap_${row},${col}`;
    }

    ledToTrap(move, nextMove) {
        // Simple heuristic: if next move has fewer options, previous move was bad
        // This is a simplified check - in reality we'd need board state
        return true; // Placeholder
    }

    // Generate training data from human games
    generateTrainingData() {
        const trainingData = [];
        
        // Convert experiences to training examples
        for (const experience of this.experienceBuffer) {
            if (experience.player === 'H') {
                // Create training example: board -> human move probability
                const trainingExample = {
                    board: experience.board,
                    humanMoveProbability: this.calculateHumanMoveProbability(experience),
                    context: experience.phase
                };
                trainingData.push(trainingExample);
            }
        }
        
        return trainingData;
    }

    // Calculate probability of human making this move based on patterns
    calculateHumanMoveProbability(experience) {
        const { move, phase } = experience;
        const moveKey = this.encodeMovePattern(move, experience.board);
        
        const frequency = this.humanPatterns.movePreferences.get(moveKey) || 1;
        const totalMoves = Array.from(this.humanPatterns.movePreferences.values()).reduce((a, b) => a + b, 1);
        
        return frequency / totalMoves;
    }

    // Save game data to file
    async saveGameData(gameData) {
        try {
            await fs.mkdir(this.gameDataPath, { recursive: true });
            
            const filename = `game_${gameData.id}_${Date.now()}.json`;
            const filepath = path.join(this.gameDataPath, filename);
            
            await fs.writeFile(filepath, JSON.stringify(gameData, null, 2));
        } catch (error) {
            console.error('Failed to save game data:', error);
        }
    }

    // Save analyzed patterns
    async savePatterns() {
        try {
            await fs.mkdir(this.patternsPath, { recursive: true });
            
            const patternsData = {
                startingPositions: Object.fromEntries(this.humanPatterns.startingPositions),
                movePreferences: Object.fromEntries(this.humanPatterns.movePreferences),
                trapAttempts: Object.fromEntries(this.humanPatterns.trapAttempts),
                escapePatterns: Object.fromEntries(this.humanPatterns.escapePatterns),
                lastUpdated: new Date().toISOString()
            };
            
            const filepath = path.join(this.patternsPath, 'human_patterns.json');
            await fs.writeFile(filepath, JSON.stringify(patternsData, null, 2));
            
            console.log('📊 Human patterns saved');
        } catch (error) {
            console.error('Failed to save patterns:', error);
        }
    }

    // Load patterns from file
    async loadPatterns() {
        try {
            const filepath = path.join(this.patternsPath, 'human_patterns.json');
            const data = await fs.readFile(filepath, 'utf8');
            const patterns = JSON.parse(data);
            
            this.humanPatterns.startingPositions = new Map(Object.entries(patterns.startingPositions || {}));
            this.humanPatterns.movePreferences = new Map(Object.entries(patterns.movePreferences || {}));
            this.humanPatterns.trapAttempts = new Map(Object.entries(patterns.trapAttempts || {}));
            this.humanPatterns.escapePatterns = new Map(Object.entries(patterns.escapePatterns || {}));
            
            console.log('📂 Human patterns loaded');
        } catch (error) {
            console.log('No existing patterns found, starting fresh');
        }
    }

    // Get insights about human play patterns
    getHumanInsights() {
        const insights = {
            totalExperiences: this.experienceBuffer.length,
            favoriteStartingPositions: this.getTopPatterns(this.humanPatterns.startingPositions, 5),
            commonMovePatterns: this.getTopPatterns(this.humanPatterns.movePreferences, 10),
            trapAttempts: this.getTopPatterns(this.humanPatterns.trapAttempts, 5),
            lastAnalysis: new Date().toISOString()
        };
        
        return insights;
    }

    // Helper to get top patterns from a map
    getTopPatterns(patternMap, limit) {
        return Array.from(patternMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([pattern, count]) => ({ pattern, count }));
    }

    // Get training data for neural network
    getTrainingData() {
        return this.generateTrainingData();
    }

    // Initialize experience replay system
    async initialize() {
        await this.loadPatterns();
        console.log('🧠 Experience Replay ready');
    }
}

module.exports = ExperienceReplay;
