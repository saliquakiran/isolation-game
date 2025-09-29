const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const gameRoutes = require('./routes/game');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');

// Import services
const GameEngine = require('./services/GameEngine');
const NeuralNetwork = require('./services/NeuralNetwork');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.gameEngine = new GameEngine();
        this.neuralNetwork = new NeuralNetwork();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // Compression
        this.app.use(compression());
        
        // CORS
        this.app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));
        
        // Body parsing
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Logging
        this.app.use(morgan('combined'));
        
        // Static files for AI models
        this.app.use('/models', express.static(path.join(__dirname, '../data/models')));
    }

    setupRoutes() {
        // Inject services into routes
        this.app.set('gameEngine', this.gameEngine);
        this.app.set('neuralNetwork', this.neuralNetwork);

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                ai: this.neuralNetwork.isLoaded() ? 'ready' : 'loading'
            });
        });

        // API routes
        this.app.use('/api/game', gameRoutes);
        this.app.use('/api/ai', aiRoutes);
        this.app.use('/api/stats', statsRoutes);

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Error:', err);
            
            if (err.name === 'ValidationError') {
                return res.status(400).json({ error: err.message });
            }
            
            if (err.name === 'UnauthorizedError') {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            res.status(500).json({ 
                error: process.env.NODE_ENV === 'production' 
                    ? 'Internal server error' 
                    : err.message 
            });
        });
    }

    async start() {
        try {
            // Initialize AI components
            console.log('🤖 Initializing AI components...');
            await this.neuralNetwork.initialize();
            await this.gameEngine.initialize(this.neuralNetwork);
            
            // Start server
            this.app.listen(this.port, () => {
                console.log(`🚀 Server running on port ${this.port}`);
                console.log(`🎮 AI Status: ${this.neuralNetwork.isLoaded() ? 'Ready' : 'Loading...'}`);
                console.log(`📊 Environment: ${process.env.NODE_ENV}`);
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
const server = new Server();
server.start();
