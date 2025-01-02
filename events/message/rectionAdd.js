const { Events } = require('discord.js'); // Importer Events

module.exports = (client) => {
    client.on(Events.MessageReactionAdd, async (reaction) => {
        try {
            await reaction.fetch();
        }
        catch (error) {
            console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
        }
        messageReactionAdd.checkReaction(reaction, 'add');
    });
};