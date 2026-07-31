// src/config/socket.js — Socket.io initialization with JWT auth middleware
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

// Map of userId -> socketId for online presence
const onlineUsers = new Map();

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    logger.info(`⚡ Socket connected: user=${userId}, socket=${socket.id}`);

    // Join a personal room for targeted delivery
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      logger.info(`⚡ Socket disconnected: user=${userId}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function getOnlineUsers() {
  return onlineUsers;
}

module.exports = { initSocket, getIo, getOnlineUsers };
