// filepath: /d:/Projets/Code/LP_Bot/logger.js
require('dotenv').config();

const util = require('util');
const { SPLAT } = require('triple-beam');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const level = process.env.LOG_LEVEL || 'debug';

// Formatte les éventuels arguments supplémentaires (ex: logger.warn('msg', objet))
// qui ne sont sinon jamais affichés, winston les traitant comme des métadonnées
// silencieusement fusionnées dans "info" au lieu du message.
const logFormat = printf((info) => {
	const { level, message, timestamp } = info;
	const splatArgs = info[SPLAT] || [];
	const extra = splatArgs
		.map((arg) => (typeof arg === 'object' && arg !== null ? util.inspect(arg, { depth: null, colors: false }) : arg))
		.join(' ');

	return `${timestamp} [${level}]: ${message}${extra ? ` ${extra}` : ''}`;
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