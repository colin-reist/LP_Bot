/* eslint-disable indent */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resettag')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Reset les tags'),
    async execute(interaction) {
        await interaction.reply('Efface tout les tags');
    },
};