const { EmbedBuilder } = require('discord.js');
const { BotSettings } = require('../../database/database.js');
const logger = require('../logger.js');
const ids = require('../../config/ids.json');
const { getChannelId } = require('../utils/channelConfig.js');

/**
 * Rappel de bump persistant : l'heure du prochain rappel est enregistrée en base
 * (BotSettings, clé `bump.nextAt`), donc un redémarrage du bot ne le perd plus.
 */

const SETTING_KEY = 'bump.nextAt';
const BUMP_DELAY_MS = 2 * 60 * 60 * 1000;

let timer = null;

async function sendReminder(client) {
	timer = null;
	try {
		await BotSettings.destroy({ where: { setting_key: SETTING_KEY } });
	} catch (error) {
		logger.error('Bump : impossible de supprimer le rappel en base :', error);
	}

	const channel = client.channels.cache.get(getChannelId('bump'));
	if (!channel?.isTextBased()) {
		logger.error('Bump : salon introuvable ou non textuel.');
		return;
	}

	const embed = new EmbedBuilder()
		.setColor('#EBBC4E')
		.setTitle('Il est temps de Bump !')
		.addFields({ name: ' ', value: `Utilisez la commande de /Bump de <@${ids.users.bumpBot}>` });

	await channel.send(`Il est temps de Bump ! <@&${ids.roles.bumpPing}> !`);
	await channel.send({ embeds: [embed] });
}

function schedule(client, at) {
	if (timer) clearTimeout(timer);
	const delay = Math.max(0, at - Date.now());
	timer = setTimeout(() => {
		sendReminder(client).catch(error => logger.error('Bump : erreur lors de l\'envoi du rappel :', error));
	}, delay);
	logger.debug(`Bump : rappel programmé dans ${Math.round(delay / 60000)} min`);
}

/**
 * À appeler après un /bump réussi : programme le rappel dans 2 h et le persiste.
 * @param {import('discord.js').Client} client
 */
async function scheduleBumpReminder(client) {
	const at = Date.now() + BUMP_DELAY_MS;
	try {
		await BotSettings.upsert({ setting_key: SETTING_KEY, setting_value: String(at) });
	} catch (error) {
		logger.error('Bump : impossible d\'enregistrer le rappel en base :', error);
	}
	schedule(client, at);
}

/**
 * À appeler au démarrage : reprend un rappel en attente (envoyé tout de suite s'il est déjà dû).
 * @param {import('discord.js').Client} client
 */
async function restoreBumpReminder(client) {
	try {
		const row = await BotSettings.findByPk(SETTING_KEY);
		if (!row) return;
		const at = Number(row.setting_value);
		if (!Number.isFinite(at)) return;
		schedule(client, at);
		logger.info('Bump : rappel en attente restauré.');
	} catch (error) {
		logger.error('Bump : impossible de restaurer le rappel :', error);
	}
}

module.exports = { scheduleBumpReminder, restoreBumpReminder };
