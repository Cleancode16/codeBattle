const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const MONGODB_URL = process.env.DB_URL;
        
        if (!MONGODB_URL) {
            console.error('Error: DB_URL is not defined in .env file');
            process.exit(1);
        }

        console.log('Attempting to connect to MongoDB...');
        
        await mongoose.connect(MONGODB_URL);
        
        console.log('MongoDB connected successfully');
        console.log('Database:', mongoose.connection.name);
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
});

module.exports = connectDB;
