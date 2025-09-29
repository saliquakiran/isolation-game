const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// This will be injected by the server
let gameEngine = null;

// Middleware to inject gameEngine
router.use((req, res, next) => {
    if (!gameEngine) {
        gameEngine = req.app.get('gameEngine');
    }
    next();
});

// Create a new game
router.post('/create', (req, res) => {
    try {
        const playerId = req.body.playerId || uuidv4();
        const game = gameEngine.createGame(playerId);
        
        res.json({
            success: true,
            game: {
                id: game.id,
                playerId: game.playerId,
                board: game.board,
                gamePhase: game.gamePhase,
                currentPlayer: game.currentPlayer
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Place starting position
router.post('/:gameId/start', (req, res) => {
    try {
        const { gameId } = req.params;
        const { row, col } = req.body;
        
        if (typeof row !== 'number' || typeof col !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Row and col must be numbers'
            });
        }
        
        if (row < 0 || row >= 7 || col < 0 || col >= 7) {
            return res.status(400).json({
                success: false,
                error: 'Position must be within board bounds (0-6)'
            });
        }
        
        const game = gameEngine.placeStartingPosition(gameId, row, col);
        
        res.json({
            success: true,
            game: {
                id: game.id,
                board: game.board,
                humanPos: game.humanPos,
                aiPos: game.aiPos,
                gamePhase: game.gamePhase,
                currentPlayer: game.currentPlayer
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Make human move
router.post('/:gameId/move', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { row, col } = req.body;
        
        if (typeof row !== 'number' || typeof col !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Row and col must be numbers'
            });
        }
        
        const game = await gameEngine.makeHumanMove(gameId, row, col);
        
        console.log('🎯 Human move made. Game phase:', game.gamePhase);
        console.log('Winner:', game.winner);
        
        // Check if game is still active
        if (game.gamePhase === 'ended') {
            console.log('🎉 Game ended after human move! Winner:', game.winner);
            return res.json({
                success: true,
                game: {
                    id: game.id,
                    board: game.board,
                    humanPos: game.humanPos,
                    aiPos: game.aiPos,
                    gamePhase: game.gamePhase,
                    currentPlayer: game.currentPlayer,
                    winner: game.winner,
                    moveHistory: game.moveHistory
                },
                message: `Game ended! Winner: ${game.winner === 'H' ? 'Human' : 'AI'}`
            });
        }
        
        // Return human move result with AI turn state
        res.json({
            success: true,
            game: {
                id: game.id,
                board: game.board,
                humanPos: game.humanPos,
                aiPos: game.aiPos,
                gamePhase: game.gamePhase,
                currentPlayer: game.currentPlayer,
                winner: game.winner,
                moveHistory: game.moveHistory
            },
            message: 'Human move made. AI turn next.'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Make AI move
router.post('/:gameId/ai-move', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        const game = gameEngine.getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        if (game.currentPlayer !== 'A') {
            return res.status(400).json({
                success: false,
                error: 'Not AI turn'
            });
        }
        
        const updatedGame = await gameEngine.makeAIMove(gameId);
        
        res.json({
            success: true,
            game: {
                id: updatedGame.id,
                board: updatedGame.board,
                humanPos: updatedGame.humanPos,
                aiPos: updatedGame.aiPos,
                gamePhase: updatedGame.gamePhase,
                currentPlayer: updatedGame.currentPlayer,
                winner: updatedGame.winner,
                moveHistory: updatedGame.moveHistory
            },
            aiMove: {
                from: updatedGame.moveHistory[updatedGame.moveHistory.length - 1].from,
                to: updatedGame.moveHistory[updatedGame.moveHistory.length - 1].to
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get game state
router.get('/:gameId', (req, res) => {
    try {
        const { gameId } = req.params;
        const game = gameEngine.getGame(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        res.json({
            success: true,
            game: {
                id: game.id,
                playerId: game.playerId,
                board: game.board,
                humanPos: game.humanPos,
                aiPos: game.aiPos,
                gamePhase: game.gamePhase,
                currentPlayer: game.currentPlayer,
                winner: game.winner,
                moveHistory: game.moveHistory,
                createdAt: game.createdAt,
                endedAt: game.endedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get valid moves for current player
router.get('/:gameId/valid-moves', (req, res) => {
    try {
        const { gameId } = req.params;
        const game = gameEngine.getGame(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        let validMoves = [];
        
        if (game.gamePhase === 'playing') {
            const currentPos = game.currentPlayer === 'H' ? game.humanPos : game.aiPos;
            validMoves = gameEngine.getValidMoves(game.board, currentPos);
        }
        
        res.json({
            success: true,
            validMoves: validMoves,
            currentPlayer: game.currentPlayer,
            gamePhase: game.gamePhase
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get game statistics
router.get('/stats/overview', (req, res) => {
    try {
        const stats = gameEngine.getStats();
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get move history for a game
router.get('/:gameId/history', (req, res) => {
    try {
        const { gameId } = req.params;
        const game = gameEngine.getGame(gameId);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        res.json({
            success: true,
            moveHistory: game.moveHistory.map(move => ({
                player: move.player,
                from: move.from,
                to: move.to,
                timestamp: move.timestamp
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all active games (for debugging/admin)
router.get('/admin/active', (req, res) => {
    try {
        // This would typically require admin authentication
        const activeGames = Array.from(gameEngine.activeGames.values()).map(game => ({
            id: game.id,
            playerId: game.playerId,
            gamePhase: game.gamePhase,
            currentPlayer: game.currentPlayer,
            createdAt: game.createdAt,
            moveCount: game.moveHistory.length
        }));
        
        res.json({
            success: true,
            activeGames: activeGames,
            count: activeGames.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Undo last move
router.post('/:gameId/undo', async (req, res) => {
    try {
        const { gameId } = req.params;
        console.log(`🔄 Undo request for game: ${gameId}`);
        
        const game = gameEngine.getGame(gameId);
        
        if (!game) {
            console.log('❌ Game not found');
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        console.log(`📊 Game state - Phase: ${game.gamePhase}, Move history length: ${game.moveHistory.length}`);
        
        if (game.gamePhase === 'ended') {
            console.log('❌ Cannot undo in ended game');
            return res.status(400).json({
                success: false,
                error: 'Cannot undo moves in ended game'
            });
        }
        
        if (game.moveHistory.length === 0) {
            console.log('❌ No moves to undo');
            return res.status(400).json({
                success: false,
                error: 'No moves to undo'
            });
        }
        
        console.log('🎯 Calling undoLastMove...');
        const updatedGame = await gameEngine.undoLastMove(gameId);
        console.log('✅ Undo completed, new move history length:', updatedGame.moveHistory.length);
        
        res.json({
            success: true,
            game: {
                id: updatedGame.id,
                board: updatedGame.board,
                humanPos: updatedGame.humanPos,
                aiPos: updatedGame.aiPos,
                gamePhase: updatedGame.gamePhase,
                currentPlayer: updatedGame.currentPlayer,
                winner: updatedGame.winner,
                moveHistory: updatedGame.moveHistory
            }
        });
    } catch (error) {
        console.error('❌ Undo error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
