const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resetname')
		.addUserOption(option => option.setName('user').setDescription('The user to reset the name').setRequired(true))
		.setDescription('Rename all members of the server'),
	async execute(interaction) {
		// Check if the user has the required role
		const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Test lp bot');
		if (!interaction.member.roles.cache.has(requiredRole.id)) {
			return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
		}
	
		// Rest of your code here...
		await interaction.reply({ content: 'Réinitialisation du nom de l\'utilisateur...', ephemeral: true });
	
		const user = interaction.options.getUser('user');
		const member = await interaction.guild.members.fetch(user.id);
		await member.setNickname(user.username);
	
		await interaction.editReply({ content: 'Le nom de l\'utilisateur a été réinitialisé', ephemeral: true });	
	},
};