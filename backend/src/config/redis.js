// src/config/redis.js — ioredis client
const Redis = require('ioredis');
const logger = require('./logger');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying
    return Math.min(times * 200, 2000);
  },
});

redisClient.on('connect', () => logger.info('✅ Redis connected'));
redisClient.on('error', (err) => logger.warn('⚠️ Redis error:', err.message));

async function testRedisConnection() {
  try {
    await redisClient.connect();
    await redisClient.ping();
  } catch (error) {
    logger.warn('⚠️ Redis not available (non-critical):', error.message);
  }
}

module.exports = { redisClient, testRedisConnection };
