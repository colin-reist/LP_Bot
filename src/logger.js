require('dotenv').config();

const util = require('util');
const { SPLAT } = require('triple-beam');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, json } = format;

/**
 * Logger console du bot.
 *
 * Niveaux (du plus important au plus bavard) :
 *   error  → une action a échoué
 *   warn   → situation anormale mais gérée (salon introuvable, config manquante…)
 *   info   → événements métier : démarrage, déclenchement anti-spam, réglages modifiés…
 *   debug  → détail des décisions (compteurs, raisons d'ignorer un message)
 *   silly  → bruit à chaque message (XP, cooldowns) : à n'activer que ponctuellement
 *
 * Variables d'environnement :
 *   LOG_LEVEL   niveau minimum affiché (défaut : debug)
 *   LOG_FORMAT  "json" pour une ligne JSON par log, sinon texte lisible (défaut)
 *   LOG_FILE    fichier de log (défaut : combined.log, "off" pour désactiver)
 *
 * Logger par module : const log = logger.child({ module: 'imageSpam' });
 * → 2026-11-05T12:00:00.000Z [info] [imageSpam] message
 */
const level = process.env.LOG_LEVEL || 'debug';
const useJson = process.env.LOG_FORMAT === 'json';
const logFile = process.env.LOG_FILE ?? 'combined.log';

// Formatte les éventuels arguments supplémentaires (ex: logger.warn('msg', objet))
// qui ne sont sinon jamais affichés, winston les traitant comme des métadonnées
// silencieusement fusionnées dans "info" au lieu du message.
const textFormat = printf((info) => {
	const { message, module } = info;
	const splatArgs = info[SPLAT] || [];
	const extra = splatArgs
		.map((arg) => (typeof arg === 'object' && arg !== null ? util.inspect(arg, { depth: null, colors: false }) : arg))
		.join(' ');

	return `${info.timestamp} [${info.level}]${module ? ` [${module}]` : ''}: ${message}${extra ? ` ${extra}` : ''}`;
});

const logTransports = [new transports.Console()];
if (logFile && logFile !== 'off') {
	// Rotation : 3 fichiers de 5 Mo max, pour ne pas remplir le disque du serveur
	logTransports.push(new transports.File({ filename: logFile, maxsize: 5 * 1024 * 1024, maxFiles: 3, tailable: true }));
}

const logger = createLogger({
	level: level,
	format: combine(
		timestamp(),
		useJson ? json() : textFormat,
	),
	transports: logTransports,
});

module.exports = logger;
