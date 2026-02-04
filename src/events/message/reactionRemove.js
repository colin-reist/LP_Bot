const { Events } = require('discord.js');
const { starboard } = require('../../handlers/concoursHandler.js');
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');
const { createEventHandler } = require('../../utils/eventWrapper.js');

async function handleReactionRemove(reaction) {
	// Fetch la réaction complète si partielle
	if (reaction.partial) {
		await reaction.fetch();
	}

	logger.debug('MessageReactionRemove event processed');

	// Vérification des channels
	if (reaction.message.channel.id === ids.channels.arts ||
		reaction.message.channel.id === ids.channels.bestOfArts) {
		await starboard(reaction, 'remove', reaction.client);
	}
}

// Export avec wrapper de gestion d'erreurs
module.exports = createEventHandler(
	Events.MessageReactionRemove,
	handleReactionRemove,
	{ logExecution: false, timeout: 10000 }
);