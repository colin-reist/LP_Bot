const { getChannelId } = require('./channelConfig.js');
const logger = require('../logger.js');

/**
 * Envoie un embed dans le salon de logs du bot (/config → « Logs du bot »).
 * Ne lève jamais d'erreur : un échec est seulement signalé dans la console,
 * pour qu'un log raté ne casse pas la fonctionnalité qui l'appelle.
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').EmbedBuilder} embed
 * @returns {Promise<boolean>} true si le message est parti
 */
async function logToDiscord(client, embed) {
	const channelId = getChannelId('logs');
	if (!channelId) {
		logger.warn('Log Discord ignoré : aucun salon « Logs du bot » configuré');
		return false;
	}

	try {
		const channel = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId);
		if (!channel?.isTextBased()) {
			logger.warn(`Log Discord ignoré : salon de logs introuvable ou non textuel (ID: ${channelId})`);
			return false;
		}
		await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
		return true;
	} catch (error) {
		logger.warn(`Log Discord impossible dans le salon ${channelId} :`, error);
		return false;
	}
}

module.exports = { logToDiscord };
