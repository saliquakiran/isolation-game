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

// Get overall game statistics
router.get('/overview', (req, res) => {
    try {
        const gameStats = gameEngine.getStats();
        const modelInfo = neuralNetwork.getModelInfo();
        
        res.json({
            success: true,
            stats: {
                games: {
                    total: gameStats.totalGames,
                    humanWins: gameStats.humanWins,
                    aiWins: gameStats.aiWins,
                    winRate: gameStats.winRate,
                    averageLength: Math.round(gameStats.averageGameLength * 100) / 100
                },
                ai: {
                    status: neuralNetwork.isLoaded() ? 'ready' : 'loading',
                    modelLoaded: modelInfo.loaded,
                    totalParams: modelInfo.totalParams || 0,
                    layers: modelInfo.layers || 0
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get detailed game statistics
router.get('/games', (req, res) => {
    try {
        const gameStats = gameEngine.getStats();
        
        // Calculate additional statistics
        const humanWinRate = gameStats.totalGames > 0 ? 
            (gameStats.humanWins / gameStats.totalGames * 100).toFixed(1) : '0';
        const aiWinRate = gameStats.totalGames > 0 ? 
            (gameStats.aiWins / gameStats.totalGames * 100).toFixed(1) : '0';
        
        const detailedStats = {
            totalGames: gameStats.totalGames,
            humanWins: gameStats.humanWins,
            aiWins: gameStats.aiWins,
            winRates: {
                human: humanWinRate + '%',
                ai: aiWinRate + '%'
            },
            gameLength: {
                average: Math.round(gameStats.averageGameLength * 100) / 100,
                distribution: {
                    short: 0,  // < 10 moves
                    medium: 0, // 10-20 moves
                    long: 0    // > 20 moves
                }
            },
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            detailedStats: detailedStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Reset game statistics
router.post('/reset', async (req, res) => {
    try {
        const resetStats = await gameEngine.resetStats();
        
        res.json({
            success: true,
            message: 'Game statistics reset successfully',
            stats: resetStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get AI performance metrics
router.get('/ai-performance', (req, res) => {
    try {
        const gameStats = gameEngine.getStats();
        const modelInfo = neuralNetwork.getModelInfo();
        
        const performance = {
            overall: {
                winRate: gameStats.totalGames > 0 ? 
                    ((gameStats.aiWins / gameStats.totalGames) * 100).toFixed(1) + '%' : '0%',
                totalGames: gameStats.totalGames,
                aiWins: gameStats.aiWins,
                humanWins: gameStats.humanWins
            },
            model: {
                loaded: modelInfo.loaded,
                parameters: modelInfo.totalParams || 0,
                layers: modelInfo.layers || 0,
                inputShape: modelInfo.inputShape || null,
                outputShape: modelInfo.outputShape || null
            },
            recent: {
                last10Games: {
                    aiWins: 0, // This would be calculated from recent games
                    humanWins: 0,
                    averageLength: 0
                }
            },
            timestamp: new Date().toISOString()
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

// Get human player insights
router.get('/human-insights', async (req, res) => {
    try {
        const ExperienceReplay = require('../services/ExperienceReplay');
        const experienceReplay = new ExperienceReplay();
        await experienceReplay.initialize();
        
        const insights = experienceReplay.getHumanInsights();
        
        res.json({
            success: true,
            humanInsights: insights
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get training statistics
router.get('/training', (req, res) => {
    try {
        // This would typically come from a training service or database
        const trainingStats = {
            totalSessions: 0,
            totalTrainingExamples: 0,
            lastTrainingSession: null,
            modelVersions: ['1.0.0'],
            trainingMethods: {
                humanGames: 0,
                syntheticData: 0
            },
            performance: {
                initialWinRate: '50%',
                currentWinRate: gameEngine.getStats().totalGames > 0 ? 
                    ((gameEngine.getStats().aiWins / gameEngine.getStats().totalGames) * 100).toFixed(1) + '%' : '50%',
                improvement: '0%'
            }
        };
        
        res.json({
            success: true,
            trainingStats: trainingStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get system health and performance
router.get('/system-health', (req, res) => {
    try {
        const health = {
            server: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
                },
                nodeVersion: process.version
            },
            ai: {
                status: neuralNetwork.isLoaded() ? 'ready' : 'loading',
                modelLoaded: neuralNetwork.isLoaded(),
                lastUpdate: new Date().toISOString()
            },
            database: {
                status: 'connected', // This would check actual DB connection
                activeGames: gameEngine.getStats().activeGames
            },
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            health: health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get leaderboard (if multiple players)
router.get('/leaderboard', (req, res) => {
    try {
        // This would typically come from a database with multiple players
        // For now, return placeholder data
        const leaderboard = {
            topPlayers: [
                {
                    playerId: 'player1',
                    gamesPlayed: 10,
                    winRate: '60%',
                    averageGameLength: 15.2
                },
                {
                    playerId: 'player2',
                    gamesPlayed: 8,
                    winRate: '37.5%',
                    averageGameLength: 18.5
                }
            ],
            totalPlayers: 2,
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            leaderboard: leaderboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export statistics data
router.get('/export', (req, res) => {
    try {
        const gameStats = gameEngine.getStats();
        const modelInfo = neuralNetwork.getModelInfo();
        
        const exportData = {
            exportDate: new Date().toISOString(),
            gameStats: gameStats,
            modelInfo: modelInfo,
            systemInfo: {
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        };
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="isolation-stats-${Date.now()}.json"`);
        
        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Note: Duplicate reset route removed - using the one above

module.exports = router;
