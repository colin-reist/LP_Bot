const { Events } = require('discord.js');
const { starboard } = require('../../handlers/concoursHandler.js');
module.exports = (client) => {
    client.on(Events.MessageReactionRemove, async (reaction) => {
        try {
            await reaction.fetch();
        }
        catch (error) {
            logger.error('Something went wrong when fetching the message:', error);
        }
        checkReaction(reaction, 'remove');
    });
}

async function checkReaction(reaction, addOrRemove) {
    if (reaction.message.channel.id === '1079499858064441344' || reaction.message.channel.id === '1153607344505245736') {
        starboard(reaction, addOrRemove, client);
    }
}