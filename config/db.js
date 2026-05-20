const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dating-app';
    
    const options = {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 50, // Optimize memory usage and connection limits
      minPoolSize: 10,
      family: 4 
    };

    await mongoose.connect(MONGO_URI, options);
    
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    try {
      const fs = require('fs');
      const path = require('path');
      fs.appendFileSync(
        path.join(__dirname, '../connection_error.log'),
        `[${new Date().toISOString()}] MongoDB Connection Failed: ${error.message}\nStack: ${error.stack}\n\n`
      );
    } catch (e) {
      console.error('Failed to write to connection_error.log:', e);
    }
    // Exit process with failure if initial connection fails
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

module.exports = connectDB;
