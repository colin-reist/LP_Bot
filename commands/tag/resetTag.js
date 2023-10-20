/* eslint-disable indent */
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resettag')
		.setDescription('Reset les tags'),
    async execute(interaction) {
        await interaction.reply('Efface tout les tags');
    },
};