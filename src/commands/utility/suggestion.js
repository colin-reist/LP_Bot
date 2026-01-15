/* eslint-disable indent */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    category: 'utility',
	data: new SlashCommandBuilder()
		.setName('suggérer')
		.setDescription('Permet de faire une suggestion')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('suggestion').setDescription('Description de la suggestion').setRequired(true))
        .addMentionableOption(option =>
            option.setName('suggerant').setDescription('Personne qui fait la suggestion').setRequired(true))
        .addAttachmentOption(option =>
            option.setName('image').setDescription('Image de la suggestion').setRequired(false)),
    async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Administrateur`.',
				ephemeral: true
			});
		}

        await interaction.reply('Suggestion envoyée');
    },
};