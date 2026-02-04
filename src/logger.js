// filepath: /d:/Projets/Code/LP_Bot/logger.js
require('dotenv').config();

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const level = process.env.LOG_LEVEL || 'debug';

const logFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
	level: level,
	format: combine(
		timestamp(),
		logFormat,
	),
	transports: [
		new transports.Console(),
		new transports.File({ filename: 'combined.log' }),
	],
});

module.exports = logger;