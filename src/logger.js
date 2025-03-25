// filepath: /d:/Projets/Code/LP_Bot/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const config = require('../config/MainConfig.json');
const level = config.loggerLevel || 'debug';

console.log('Logger level:', level, 'config:', config.loggerLevel);

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: level,
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'combined.log' })
  ],
});

module.exports = logger;