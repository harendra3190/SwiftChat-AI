// src/config/mongodb.js — Mongoose MongoDB connection
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);
const logger = require('./logger');

async function connectMongoDB(retries = 5) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftchat';
  const maskedUri = uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.*)/, '$1****$3');
  
  if (!process.env.MONGODB_URI) {
    logger.error('CRITICAL: MONGODB_URI is missing from environment');
  }

  while (retries > 0) {
    try {
      logger.info(`🔄 Attempting MongoDB connection: ${maskedUri}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 for faster cloud resolution
        bufferCommands: false // Disable buffering to prevent hangs
      });
      logger.info(`✅ MongoDB connected via Mongoose: ${maskedUri}`);
      return;
    } catch (error) {
      retries -= 1;
      logger.warn(`⚠️ MongoDB connection failed: ${error.message}. Retries left: ${retries}`);
      if (retries === 0) {
        logger.error('❌ Could not connect to MongoDB after multiple attempts. Exiting...');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

module.exports = { connectMongoDB };
