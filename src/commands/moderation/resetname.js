const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
	staffOnly: true,
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('resetname')
		.setDescription('Réinitialise le nom d\'un utilisateur')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
		.addUserOption(option => option.setName('user').setDescription('The user to reset the name').setRequired(true)),
	async execute(interaction) {
		// Rest of your code here...
		await interaction.reply({ content: 'Réinitialisation du nom de l\'utilisateur...', flags: MessageFlags.Ephemeral });

		const user = interaction.options.getUser('user');
		const member = await interaction.guild.members.fetch(user.id);
		await member.setNickname(user.username);

		await interaction.editReply({ content: 'Le nom de l\'utilisateur a été réinitialisé', flags: MessageFlags.Ephemeral });
	},
};