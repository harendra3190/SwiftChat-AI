// src/app.js — Express application bootstrap
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('passport');
const mongoSanitize = require('express-mongo-sanitize');
const { xssSanitize } = require('./middleware/xssSanitize');

const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const logger = require('./config/logger');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const interactionRoutes = require('./routes/interaction.routes');
const aiRoutes = require('./routes/ai.routes');

// Passport config
require('./config/passport');

const app = express();

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(mongoSanitize());
app.use(xssSanitize());

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Request Parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ────────────────────────────────────────────────────────────────
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Auth Middleware ─────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── Rate Limiting ───────────────────────────────────────────────────────────
app.use('/api/', rateLimiter);

// ─── Static files (uploads) ──────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SwiftChat API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Documentation ───────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/ai', aiRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
