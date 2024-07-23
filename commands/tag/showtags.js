/* eslint-disable indent */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('showtags')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Retourne tout les tags'),
    async execute(interaction) {
        await interaction.reply('Retourne tout les tags');
    },
};