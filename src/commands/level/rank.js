const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Te donne ton niveau d\'expérience'),
    async execute(interaction) {
        try {
            const user = await Users.findOne({ 
                where: sequelize.where(sequelize.cast(sequelize.col("discord_identifier"), "TEXT"), interaction.user.id)
            });

            logger.debug(`Utilisateur trouvé: ${JSON.stringify(user)}`);
            await interaction.reply({ content: `Tu as actuellement ${user.experience}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `⚠️ Erreur lors de l'execution de la commande\n Merci de prévenir le staff`, ephemeral: true });
            logger.error('Erreur lors de la récupération de l\'experience de l\'utilisateur :\n', error);
        }
    },
};
