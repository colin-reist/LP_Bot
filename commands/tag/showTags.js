/* eslint-disable indent */
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('showtags')
		.setDescription('Retourne tout les tags'),
    async execute(interaction) {
        await interaction.reply('Retourne tout les tags');
    },
};