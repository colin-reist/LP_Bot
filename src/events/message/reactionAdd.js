const { Events } = require('discord.js');
const logger = require('../../logger.js');
const { starboard } = require('../../handlers/concoursHandler.js');
const ids = require('../../../config/ids.json');

module.exports = (client) => {
	client.on(Events.MessageReactionAdd, async (reaction) => {
		if (reaction.me) return;
		try {
			if (!reaction.message.guild) return;
			await reaction.fetch();
		}
		catch (error) {
			logger.error('reactionAdd error : ', error);
		}
		logger.debug('reactionAdd');
		checkReaction(reaction, 'add');
	});

	async function checkReaction(reaction, addOrRemove) {
		const lewdParadiseChannelId = ids.channels.arts;
		const testChannelId = ids.channels.concoursSubmission;
		if (reaction.message.channel.id === lewdParadiseChannelId || reaction.message.channel.id === testChannelId) {
			starboard(reaction, addOrRemove, client);
		}
	}
};