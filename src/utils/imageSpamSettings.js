const { BotSettings } = require('../../database/database.js');
const { getChannelId } = require('./channelConfig.js');
const logger = require('../logger.js');

/**
 * Réglages de l'anti-spam d'images, persistés dans BotSettings (clés « imageSpam.* »)
 * et gardés en cache pour une lecture synchrone à chaque message.
 * Modifiables via /antispam, sans redéploiement.
 */
const PREFIX = 'imageSpam.';

const DEFAULT_MESSAGE = 'Ce salon est un **salon de discussion**, pas un salon de spam d\'images.\nMerci de poster vos images dans {salon} !';

/** Définition des réglages : valeur par défaut + conversion depuis la base (texte) */
const DEFINITIONS = {
	threshold: { label: 'Seuil', unit: 'image(s) d\'affilée tolérées', default: 4, parse: Number },
	windowMin: { label: 'Fenêtre', unit: 'min sans image → série remise à zéro', default: 10, parse: Number },
	cooldownSec: { label: 'Cooldown', unit: 's entre deux rappels', default: 120, parse: Number },
	deleteAfterSec: { label: 'Suppression du rappel', unit: 's (0 = jamais)', default: 60, parse: Number },
	exemptBoosters: { label: 'Boosters exemptés', unit: '', default: true, parse: v => v === 'true' },
	message: { label: 'Message', unit: '', default: DEFAULT_MESSAGE, parse: String },
	channels: { label: 'Salons surveillés', unit: '', default: [], parse: v => v.split(',').filter(Boolean) },
};

/** @type {Map<string, any>} */
const values = new Map();

async function loadImageSpamSettings() {
	try {
		await BotSettings.sync();
		const rows = await BotSettings.findAll();
		values.clear();
		for (const row of rows) {
			if (!row.setting_key.startsWith(PREFIX)) continue;
			const key = row.setting_key.slice(PREFIX.length);
			if (DEFINITIONS[key]) values.set(key, DEFINITIONS[key].parse(row.setting_value));
		}
		logger.info(`Réglages anti-spam d'images chargés (${values.size} personnalisé(s))`);
	} catch (error) {
		logger.error('Impossible de charger les réglages anti-spam, valeurs par défaut utilisées :', error);
	}
}

/**
 * @param {keyof DEFINITIONS} key
 */
function getSetting(key) {
	if (values.has(key)) return values.get(key);
	// Compatibilité : salon unique défini avant via /config (clé chatImageWatch)
	if (key === 'channels') {
		const legacy = getChannelId('chatImageWatch');
		return legacy ? [legacy] : [];
	}
	return DEFINITIONS[key].default;
}

/**
 * @param {keyof DEFINITIONS} key
 * @param {any} value
 * @param {string} [userId]
 */
async function setSetting(key, value, userId) {
	if (!DEFINITIONS[key]) throw new Error(`Réglage anti-spam inconnu : ${key}`);
	const stored = Array.isArray(value) ? value.join(',') : String(value);
	await BotSettings.upsert({ setting_key: PREFIX + key, setting_value: stored, updated_by: userId ?? null });
	values.set(key, value);
	logger.info(`Anti-spam : "${key}" = ${stored} (par ${userId ?? 'inconnu'})`);
}

/** Revient à la valeur par défaut */
async function resetSetting(key) {
	await BotSettings.destroy({ where: { setting_key: PREFIX + key } });
	values.delete(key);
}

module.exports = { DEFINITIONS, loadImageSpamSettings, getSetting, setSetting, resetSetting };
