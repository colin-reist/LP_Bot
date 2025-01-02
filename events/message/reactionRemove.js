const { Events } = require('discord.js');
module.exports = (client) => {
    client.on(Events.MessageReactionRemove, async (reaction) => {
        try {
            await reaction.fetch();
        }
        catch (error) {
            console.error('Something went wrong when fetching the message:', error);
        }
        messageReactionAdd.checkReaction(reaction, 'remove');
    });
}
