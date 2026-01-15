const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hasStaffRole } = require('#utils/permissionUtils');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('resetname')
		.setDescription('Réinitialise le nom d\'un utilisateur')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
		.addUserOption(option => option.setName('user').setDescription('The user to reset the name').setRequired(true)),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageNicknames)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Gérer les pseudos`.',
				ephemeral: true
			});
		}

		// Vérification Staff (en plus de Discord permissions)
		if (!hasStaffRole(interaction)) {
			return interaction.reply({
				content: '❌ Vous devez avoir le rôle Staff.',
				ephemeral: true
			});
		}
	
		// Rest of your code here...
		await interaction.reply({ content: 'Réinitialisation du nom de l\'utilisateur...', ephemeral: true });
	
		const user = interaction.options.getUser('user');
		const member = await interaction.guild.members.fetch(user.id);
		await member.setNickname(user.username);
	
		await interaction.editReply({ content: 'Le nom de l\'utilisateur a été réinitialisé', ephemeral: true });	
	},
};