const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.addUserOption(option => option.setName('utilisateur').setDescription('La personne à bannir').setRequired(true))
		.setDescription('Rename all members of the server'),
	async execute(interaction) {
		const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Test lp bot');
		if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }

		const user = interaction.options.getUser('target');
		guild.members.ban(user);

		await interaction.editReply({ content : 'Le nom de l\'utilisateur a été réinitialisé', ephemeral: true });
	},
};