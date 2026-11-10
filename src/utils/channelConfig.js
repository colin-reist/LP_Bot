const { ChannelType } = require('discord.js');
const { BotSettings } = require('../../database/database.js');
const ids = require('../../config/ids.json');
const logger = require('../logger.js');

/**
 * Salons configurables dynamiquement.
 * La clé correspond à celle de config/ids.json → channels, qui sert de valeur par défaut
 * tant qu'aucun salon n'a été défini via /config.
 * Pour rendre un nouveau salon configurable : l'ajouter ici (et optionnellement dans ids.json).
 */
const TEXT = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

const CHANNEL_DEFINITIONS = {
	logs: { label: 'Logs du bot', description: 'Crashs, démarrage et erreurs de commandes', types: TEXT },
	publicLogs: { label: 'Logs publics', description: 'Warns visibles par les membres', types: TEXT },
	adminLogs: { label: 'Logs admin', description: 'Bans, kicks…', types: TEXT },
	adminWarnLogs: { label: 'Logs admin (warns)', description: 'Warns côté staff', types: TEXT },
	bump: { label: 'Bump', description: 'Salon surveillé pour le rappel de bump', types: TEXT },
	levelUp: { label: 'Level up', description: 'Annonces de passage de niveau', types: TEXT },
	boosters: { label: 'Annonces boost', description: 'Remerciements des nouveaux boosters', types: TEXT },
	textBoosters: { label: 'Salon textuel boosters', description: 'Mentionné dans le message de boost', types: TEXT },
	voiceBoosters: { label: 'Salon vocal boosters', description: 'Mentionné dans le message de boost', types: [ChannelType.GuildVoice, ChannelType.GuildStageVoice] },
	tickets: { label: 'Tickets', description: 'Mentionné dans le message de boost', types: TEXT },
	smashOrPassTarget: { label: 'Smash or Pass', description: 'Salon où les postes sont republiés', types: TEXT },
	imageRedirect: { label: 'Salon images', description: 'Mentionné dans le rappel anti-spam d\'images ({salon})', types: TEXT },
};

/** @type {Map<string, string>} Valeurs définies en base (prioritaires sur ids.json) */
const overrides = new Map();
let loaded = false;

/**
 * Charge les salons configurés depuis la base. À appeler une fois au démarrage.
 */
async function loadChannelConfig() {
	try {
		await BotSettings.sync();
		const rows = await BotSettings.findAll();
		overrides.clear();
		for (const row of rows) {
			if (row.setting_key.startsWith('channel.')) {
				overrides.set(row.setting_key.slice('channel.'.length), row.setting_value);
			}
		}
		loaded = true;
		logger.info(`Configuration des salons chargée (${overrides.size} salon(s) personnalisé(s))`);
	} catch (error) {
		logger.error('Impossible de charger la configuration des salons, utilisation de ids.json :', error);
	}
}

/**
 * Retourne l'ID du salon pour une clé (synchrone, depuis le cache).
 * Ordre : valeur en base → ids.json → undefined.
 * @param {string} key
 * @returns {string|undefined}
 */
function getChannelId(key) {
	return overrides.get(key) ?? ids.channels[key];
}

/**
 * Indique d'où vient la valeur actuelle.
 * @param {string} key
 * @returns {'custom'|'default'|'unset'}
 */
function getChannelSource(key) {
	if (overrides.has(key)) return 'custom';
	if (ids.channels[key]) return 'default';
	return 'unset';
}

/**
 * Définit le salon pour une clé et le persiste en base.
 * @param {string} key
 * @param {string} channelId
 * @param {string} [userId] Auteur de la modification
 */
async function setChannelId(key, channelId, userId) {
	if (!CHANNEL_DEFINITIONS[key]) throw new Error(`Clé de salon inconnue : ${key}`);
	await BotSettings.upsert({ setting_key: `channel.${key}`, setting_value: channelId, updated_by: userId ?? null });
	overrides.set(key, channelId);
	logger.info(`Salon "${key}" défini sur ${channelId} par ${userId ?? 'inconnu'}`);
}

/**
 * Supprime la valeur personnalisée : on revient à ids.json.
 * @param {string} key
 */
async function resetChannelId(key) {
	await BotSettings.destroy({ where: { setting_key: `channel.${key}` } });
	overrides.delete(key);
	logger.info(`Salon "${key}" réinitialisé sur la valeur par défaut`);
}

/**
 * Raccourci : récupère directement l'objet salon depuis le cache.
 * @param {import('discord.js').Client} client
 * @param {string} key
 */
function getChannel(client, key) {
	const id = getChannelId(key);
	return id ? client.channels.cache.get(id) : undefined;
}

module.exports = {
	CHANNEL_DEFINITIONS,
	loadChannelConfig,
	getChannelId,
	getChannelSource,
	getChannel,
	setChannelId,
	resetChannelId,
	isLoaded: () => loaded,
};
