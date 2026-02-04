const { Events } = require('discord.js');
const logger = require('../../logger.js');
const { starboard } = require('../../handlers/concoursHandler.js');
const ids = require('../../../config/ids.json');
const { createEventHandler } = require('../../utils/eventWrapper.js');

async function handleReactionAdd(reaction) {
	// Ignore les réactions du bot
	if (reaction.me) return;

	// Ignore les messages hors serveur
	if (!reaction.message.guild) return;

	// Fetch la réaction complète si partielle
	if (reaction.partial) {
		await reaction.fetch();
	}

	logger.debug('MessageReactionAdd event processed');

	// Vérification des channels
	const lewdParadiseChannelId = ids.channels.arts;
	const testChannelId = ids.channels.concoursSubmission;

	if (reaction.message.channel.id === lewdParadiseChannelId ||
		reaction.message.channel.id === testChannelId) {
		await starboard(reaction, 'add', reaction.client);
	}
}

// Export avec wrapper de gestion d'erreurs
module.exports = createEventHandler(
	Events.MessageReactionAdd,
	handleReactionAdd,
	{ logExecution: false, timeout: 10000 }
);