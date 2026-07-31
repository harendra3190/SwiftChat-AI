const winston = require('winston');

/**
 * SwiftChat Sentient Winston Logger
 * Configured for high-fidelity neural network telemetry.
 */
const path = require('path');
const logDir = path.join(__dirname, '../../../logs');

const transports = [
  new winston.transports.Console()
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports
});

module.exports = logger;