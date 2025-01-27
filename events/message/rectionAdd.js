const { Events } = require('discord.js'); // Importer Events

module.exports = (client) => {
    client.on(Events.MessageReactionAdd, async (reaction) => {
        if (reaction.me) return;
        try {
            if (!reaction.message.guild) return;

            const botPermissions = reaction.message.guild.me.permissionsIn(reaction.message.channel);
            if (!botPermissions.has('VIEW_CHANNEL') || !botPermissions.has('READ_MESSAGE_HISTORY')) {
                throw new error('The bots does not have the required permissions to view the channel or read the message history');
            }
            await reaction.fetch();
        }
        catch (error) {
            console.error('reactionAdd error : ', error);
        }
        // messageReactionAdd.checkReaction(reaction, 'add');
    });
};