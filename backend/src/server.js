// src/server.js — HTTP server entry point
require('dotenv').config();
require('express-async-errors');

const http = require('http');
const app = require('./app');
const logger = require('./config/logger');
const { connectMongoDB } = require('./config/mongodb');
const { testRedisConnection } = require('./config/redis');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Attach Socket.io to the HTTP server
initSocket(server);

async function startServer() {
  try {
    // Connect to databases
    await connectMongoDB();
    await testRedisConnection();

    try {
      const transporter = require('./utils/email.service').createTransporter();
      await transporter.verify();
      logger.info('✅ Email transporter verified — SMTP connection healthy');
    } catch (emailErr) {
      logger.warn('⚠️ Email transporter failed verification:', emailErr.message);
      // Don't crash server — just warn
    }

    server.listen(PORT, () => {
      logger.info(`🚀 SwiftChat Backend running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdownSignals = ['SIGTERM', 'SIGINT'];
shutdownSignals.forEach((signal) => {
  process.on(signal, () => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
