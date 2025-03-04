/* eslint-disable indent */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addtag')
		.setDescription('Rajoute un tag à la liste des tags')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption(option =>
			option.setName('name').setDescription('Le nom du tag').setRequired(true))
        .addStringOption(option =>
            option.setName('description').setDescription('La description du tag').setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Rajoute un tag à la liste des tags');
	},
};