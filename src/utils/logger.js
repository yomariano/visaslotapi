const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for daily log files
const dailyFileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Console format with colors
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Create the logger
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    // Console transport
    new transports.Console({
      format: consoleFormat
    }),
    
    // Daily rotating file transport
    new transports.File({
      filename: path.join(logsDir, `api_${new Date().toISOString().split('T')[0]}.log`),
      format: dailyFileFormat,
      maxSize: '10m',
      maxFiles: '7d'
    })
  ],
  exitOnError: false
});

module.exports = logger; 