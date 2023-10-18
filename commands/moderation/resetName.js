const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resetname')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addUserOption(option => option.setName('user').setDescription('The user to reset the name').setRequired(true))
		.setDescription('Rename all members of the server'),
	async execute(interaction) {
		await interaction.reply({ content : 'Réinitialisation du nom de l\'utilisateur...', ephemeral: true });

		const user = interaction.options.getUser('user');
		const member = await interaction.guild.members.fetch(user.id);
		await member.setNickname(user.username);

		await interaction.editReply({ content : 'Le nom de l\'utilisateur a été réinitialisé', ephemeral: true });
	},
};