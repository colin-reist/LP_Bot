/* eslint-disable no-inline-comments */
const { userLevels } = require('../../database.js');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getlevel')
        .setDescription('Affiche ton niveau sur le serveur'),
    async execute(interaction) {
        try {
            // Get the user's level from the database
            const userId = interaction.user.id;
            const user = await userLevels.findOne({ where: { userID: userId } });

            // Get the user's level from the database
            const userLevel = user.dataValues['userLevels'];

            // Get the user's XP from the database
            const userXP = user.dataValues['userXP'];

            // Send the formatted string as a response in Discord
            await interaction.reply(`Ton niveau est de ${userLevel}, tu as un total de ${userXP} points d'expérience.`);
        }
        catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Il y a eu une erreur lors de la récupération de ton niveau.', ephemeral: true });
            process.exit(1);
        }
    },
};