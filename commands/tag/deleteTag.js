/* eslint-disable indent */
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deletetag')
		.setDescription('Efface un tag')
		.addStringOption(option =>
            option.setName('name').setDescription('Le nom du tag').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Efface une tag');
    },
};