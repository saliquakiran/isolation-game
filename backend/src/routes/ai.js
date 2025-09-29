const express = require('express');
const router = express.Router();

// This will be injected by the server
let gameEngine = null;
let neuralNetwork = null;

// Middleware to inject services
router.use((req, res, next) => {
    if (!gameEngine) {
        gameEngine = req.app.get('gameEngine');
    }
    if (!neuralNetwork) {
        neuralNetwork = req.app.get('neuralNetwork');
    }
    next();
});

// Get AI status and information
router.get('/status', (req, res) => {
    try {
        const modelInfo = neuralNetwork.getModelInfo();
        const gameStats = gameEngine.getStats();
        
        res.json({
            success: true,
            ai: {
                status: neuralNetwork.isLoaded() ? 'ready' : 'loading',
                model: modelInfo,
                gameStats: gameStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Evaluate a board position
router.post('/evaluate', async (req, res) => {
    try {
        const { board } = req.body;
        
        if (!board || !Array.isArray(board) || board.length !== 7) {
            return res.status(400).json({
                success: false,
                error: 'Invalid board format. Expected 7x7 array.'
            });
        }
        
        const evaluation = await neuralNetwork.evaluatePosition(board);
        
        res.json({
            success: true,
            evaluation: {
                aiWinProbability: evaluation,
                humanWinProbability: 1 - evaluation,
                confidence: Math.abs(evaluation - 0.5) * 2 // Higher is more confident
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI move suggestion for a position
router.post('/suggest-move', async (req, res) => {
    try {
        const { gameId } = req.body;
        
        if (!gameId) {
            return res.status(400).json({
                success: false,
                error: 'Game ID is required'
            });
        }
        
        const game = gameEngine.getGame(gameId);
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }
        
        if (game.gamePhase !== 'playing') {
            return res.status(400).json({
                success: false,
                error: 'Game is not in playing phase'
            });
        }
        
        const currentPos = game.currentPlayer === 'H' ? game.humanPos : game.aiPos;
        const validMoves = gameEngine.getValidMoves(game.board, currentPos);
        
        if (validMoves.length === 0) {
            return res.json({
                success: true,
                suggestedMove: null,
                message: 'No valid moves available'
            });
        }
        
        // Get AI's best move
        const bestMove = await gameEngine.enhancedMCTS(game, validMoves);
        
        res.json({
            success: true,
            suggestedMove: {
                row: bestMove[0],
                col: bestMove[1],
                position: bestMove
            },
            validMoves: validMoves,
            currentPlayer: game.currentPlayer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Train model with custom data
router.post('/train/model', async (req, res) => {
    try {
        const { trainingData } = req.body;
        
        if (!trainingData || !Array.isArray(trainingData)) {
            return res.status(400).json({
                success: false,
                error: 'Training data must be an array'
            });
        }
        
        if (trainingData.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Training data cannot be empty'
            });
        }
        
        console.log(`🎓 Training model with ${trainingData.length} examples...`);
        
        const history = await neuralNetwork.trainModel(trainingData);
        
        // Save the updated model
        await neuralNetwork.saveModel();
        
        res.json({
            success: true,
            message: 'Model training completed successfully',
            trainingHistory: {
                finalLoss: history.history.loss[history.history.loss.length - 1],
                finalAccuracy: history.history.acc ? history.history.acc[history.history.acc.length - 1] : null,
                epochs: history.history.loss.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get training statistics
router.get('/train/stats', (req, res) => {
    try {
        // This would typically come from a training service or database
        const stats = {
            totalTrainingSessions: 0,
            lastTrainingSession: null,
            modelVersion: '1.0.0',
            trainingDataSize: 0
        };
        
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

// Reset AI model
router.post('/reset', async (req, res) => {
    try {
        // Create a new model
        await neuralNetwork.createModel();
        await neuralNetwork.saveModel();
        
        res.json({
            success: true,
            message: 'AI model has been reset to initial state'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI insights and patterns
router.get('/insights', async (req, res) => {
    try {
        const ExperienceReplay = require('../services/ExperienceReplay');
        const experienceReplay = new ExperienceReplay();
        await experienceReplay.initialize();
        
        const insights = experienceReplay.getHumanInsights();
        
        res.json({
            success: true,
            insights: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Analyze AI performance
router.get('/performance', (req, res) => {
    try {
        const gameStats = gameEngine.getStats();
        
        const performance = {
            winRate: gameStats.totalGames > 0 ? 
                ((gameStats.totalGames - gameStats.humanWins) / gameStats.totalGames * 100).toFixed(1) + '%' : '0%',
            totalGames: gameStats.totalGames,
            humanWins: gameStats.humanWins,
            aiWins: gameStats.aiWins,
            averageGameLength: gameStats.averageGameLength,
            activeGames: gameStats.activeGames,
            modelStatus: neuralNetwork.isLoaded() ? 'ready' : 'loading'
        };
        
        res.json({
            success: true,
            performance: performance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export model
router.get('/export-model', async (req, res) => {
    try {
        if (!neuralNetwork.isLoaded()) {
            return res.status(400).json({
                success: false,
                error: 'Model not loaded'
            });
        }
        
        // This would typically save the model to a downloadable file
        // For now, just return model info
        const modelInfo = neuralNetwork.getModelInfo();
        
        res.json({
            success: true,
            modelInfo: modelInfo,
            message: 'Model export functionality would be implemented here'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
