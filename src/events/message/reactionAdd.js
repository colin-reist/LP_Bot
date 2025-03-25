const { Events, EmbedBuilder } = require('discord.js');
const { concours } = require('../../../database/database.js');
const logger = require('../../logger.js');
const { starboard } = require('../../handlers/concoursHandler.js');

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
        const lewdParadiseChannelId = '1079499858064441344';
        const testChannelId = '1164700276310155264';
        if (reaction.message.channel.id === lewdParadiseChannelId || reaction.message.channel.id === testChannelId) {
            starboard(reaction, addOrRemove, client);
        }
    }
};