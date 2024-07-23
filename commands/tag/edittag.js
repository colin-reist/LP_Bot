/* eslint-disable indent */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('edittag')
		.setDescription('Modifie un tag')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption(option =>
            option.setName('name').setDescription('Le nom du tag').setRequired(true))
        .addStringOption(option =>
            option.setName('description').setDescription('La description du tag').setRequired(true)),
    async execute(interaction) {
        await interaction.reply('Modifie un tag');
    },
};