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
            const user = await userLevels.findOne({ where: { ul_user_id: userId } });

            console.log(user);

            // Get the user's level from the database
            const userLevel = user.dataValues['ul_level'];

            // Get the user's XP from the database
            const userXP = user.dataValues['ul_xp'];

            // Send the formatted string as a response in Discord
            await interaction.reply(`Ton niveau est de ${userLevel}, tu as un total de ${userXP} points d'expérience.`);
            await interaction.editReply(`Hey c'est mis à jour !`);
        }
        catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Il y a eu une erreur lors de la récupération de ton niveau.', ephemeral: true });
        }
    },
};