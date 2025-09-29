const fs = require('fs').promises;
const path = require('path');

// Try to load TensorFlow, but don't fail if it's not available
let tf = null;
try {
    // Try node version first
    tf = require('@tensorflow/tfjs-node');
    console.log('✅ Using TensorFlow.js Node.js version (native performance + model saving)');
} catch (nodeError) {
    try {
        // Fallback to browser version (no native compilation needed)
        tf = require('@tensorflow/tfjs');
        console.log('✅ Using TensorFlow.js browser version (CPU-only, no model saving)');
    } catch (browserError) {
        console.warn('⚠️  TensorFlow.js not available. Neural network will use heuristic evaluation only.');
        console.warn('Node error:', nodeError.message);
        console.warn('Browser error:', browserError.message);
    }
}

class NeuralNetwork {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.modelPath = process.env.AI_MODEL_PATH || './data/models/';
        this.learningRate = parseFloat(process.env.AI_LEARNING_RATE) || 0.001;
        this.batchSize = parseInt(process.env.AI_TRAINING_BATCH_SIZE) || 32;
        
        // Model architecture parameters
        this.boardSize = 7;
        this.inputSize = this.boardSize * this.boardSize;
        this.hiddenUnits = [256, 128, 64];
        this.outputSize = 1; // Win probability for AI
        
        console.log('🧠 Neural Network initialized');
    }

    async initialize() {
        try {
            if (!tf) {
                console.log('⚠️  TensorFlow not available, using heuristic-only mode');
                this.isModelLoaded = false;
                return;
            }

            // Try to load existing model
            await this.loadModel();
            
            if (!this.isModelLoaded) {
                console.log('📝 Creating new neural network model...');
                await this.createModel();
                await this.saveModel();
            }
            
            console.log('✅ Neural Network ready');
        } catch (error) {
            console.error('❌ Failed to initialize neural network:', error);
            // Create a basic model as fallback
            await this.createModel();
        }
    }

    // Create a new neural network model
    async createModel() {
        if (!tf) {
            console.log('⚠️  Cannot create neural network model without TensorFlow');
            return;
        }

        const model = tf.sequential({
            layers: [
                // Input layer: flatten 7x7 board to 49 features
                tf.layers.dense({
                    inputShape: [this.inputSize],
                    units: this.hiddenUnits[0],
                    activation: 'relu',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
                }),
                tf.layers.dropout({ rate: 0.3 }),
                
                // Hidden layers
                tf.layers.dense({
                    units: this.hiddenUnits[1],
                    activation: 'relu',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
                }),
                tf.layers.dropout({ rate: 0.3 }),
                
                tf.layers.dense({
                    units: this.hiddenUnits[2],
                    activation: 'relu',
                    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
                }),
                
                // Output layer: single value representing AI win probability
                tf.layers.dense({
                    units: this.outputSize,
                    activation: 'sigmoid'
                })
            ]
        });

        // Compile the model
        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        this.model = model;
        this.isModelLoaded = true;
        
        console.log('🏗️  Neural network model created');
        this.model.summary();
    }

    // Convert board state to tensor input
    boardToTensor(board) {
        const flattened = [];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = board[row][col];
                let value = 0;
                
                // Encode board state: 0=empty, 1=blocked, 2=human, 3=ai
                switch (cell) {
                    case '.':
                        value = 0; // empty
                        break;
                    case '_':
                        value = 1; // blocked
                        break;
                    case 'H':
                        value = 2; // human
                        break;
                    case 'A':
                        value = 3; // ai
                        break;
                }
                
                flattened.push(value);
            }
        }
        
        // Normalize to [0, 1] range
        return tf.tensor2d([flattened.map(x => x / 3)]);
    }

    // Evaluate a board position
    async evaluatePosition(board) {
        if (!this.isModelLoaded || !this.model) {
            console.log('Model not loaded, returning random evaluation');
            return Math.random(); // Return random value if model not ready
        }

        try {
            const input = this.boardToTensor(board);
            const prediction = this.model.predict(input);
            const probability = await prediction.data();
            
            // Clean up tensors
            input.dispose();
            prediction.dispose();
            
            return probability[0]; // Return AI win probability
        } catch (error) {
            console.error('Error evaluating position:', error);
            return 0.5; // Return neutral probability on error
        }
    }

    // Train the model on game data
    async trainModel(trainingData) {
        if (!this.isModelLoaded || !this.model) {
            throw new Error('Model not loaded');
        }

        if (!trainingData || trainingData.length === 0) {
            console.log('No training data provided');
            return;
        }

        console.log(`🎓 Training model on ${trainingData.length} examples...`);

        try {
            // Prepare training data
            const inputs = [];
            const labels = [];

            for (const example of trainingData) {
                const input = this.boardToTensor(example.board);
                const label = example.aiWinProbability; // 0-1, where 1 = AI wins
                
                inputs.push(await input.data());
                labels.push(label);
                
                input.dispose();
            }

            // Convert to tensors
            const inputTensor = tf.tensor2d(inputs);
            const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

            // Train the model
            const history = await this.model.fit(inputTensor, labelTensor, {
                epochs: 10,
                batchSize: this.batchSize,
                validationSplit: 0.2,
                verbose: 1
            });

            // Clean up tensors
            inputTensor.dispose();
            labelTensor.dispose();

            console.log('✅ Model training completed');
            console.log(`📊 Final loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`);
            
            return history;
        } catch (error) {
            console.error('❌ Training failed:', error);
            throw error;
        }
    }

    // Save model to disk
    async saveModel() {
        if (!this.model) {
            throw new Error('No model to save');
        }

        try {
            // Ensure directory exists
            await fs.mkdir(this.modelPath, { recursive: true });
            
            const modelPath = path.join(this.modelPath, 'neural_network', 'model.json');
            await this.model.save(`file://${path.resolve(modelPath)}`);
            
            console.log(`💾 Model saved successfully to ${modelPath}`);
            console.log('✅ Model persistence enabled - trained models will be preserved');
        } catch (error) {
            console.warn('⚠️  Model saving failed:', error.message);
            console.warn('   Model works in memory but cannot persist to disk');
            console.warn('   This may be due to TensorFlow.js browser version limitations');
            // Don't throw error - model still works in memory
        }
    }

    // Load model from disk
    async loadModel() {
        try {
            const modelPath = path.join(this.modelPath, 'neural_network', 'model.json');
            const modelExists = await this.fileExists(path.join(this.modelPath, 'neural_network', 'model.json'));
            
            if (!modelExists) {
                console.log('📂 No existing model found');
                return false;
            }

            this.model = await tf.loadLayersModel(`file://${path.resolve(modelPath)}`);
            this.isModelLoaded = true;
            
            console.log('📂 Model loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load model:', error);
            return false;
        }
    }

    // Helper function to check if file exists
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Get model information
    getModelInfo() {
        if (!this.model) {
            return { loaded: false };
        }

        return {
            loaded: this.isModelLoaded,
            inputShape: this.model.inputs[0].shape,
            outputShape: this.model.outputs[0].shape,
            totalParams: this.model.countParams(),
            layers: this.model.layers.length
        };
    }

    // Check if model is loaded and ready
    isLoaded() {
        return this.isModelLoaded && this.model !== null;
    }

}

module.exports = NeuralNetwork;
