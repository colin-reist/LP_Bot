const { Events } = require('discord.js');
const { starboard } = require('../../handlers/concoursHandler.js');
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');

module.exports = (client) => {
	client.on(Events.MessageReactionRemove, async (reaction) => {
		try {
			await reaction.fetch();
		}
		catch (error) {
			logger.error('Something went wrong when fetching the message:', error);
		}
		checkReaction(reaction, 'remove', client);
	});
};

async function checkReaction(reaction, addOrRemove, client) {
	if (reaction.message.channel.id === ids.channels.arts || reaction.message.channel.id === ids.channels.bestOfArts) {
		starboard(reaction, addOrRemove, client);
	}
}