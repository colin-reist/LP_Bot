const { Events } = require('discord.js');
const { starboard } = require('../../handlers/concoursHandler.js');
const logger = require('../../logger.js');

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
	if (reaction.message.channel.id === '1079499858064441344' || reaction.message.channel.id === '1153607344505245736') {
		starboard(reaction, addOrRemove, client);
	}
}