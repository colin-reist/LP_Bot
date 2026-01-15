const { SlashCommandBuilder, PermissionFlagBits } = require('discord.js');
const { Punishments, Users } = require('#database');
const ids = require('#config/ids');
const { hasStaffRole } = require('#utils/permissionUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const logger = require('#logger');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Retire le warn d\'un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagBits.ModerateMembers)
		.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur qui va perdre son warn').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison').setRequired(true)),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagBits.ModerateMembers)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Modérer les membres`.',
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

		const unWarnedUser = interaction.options.getUser('utilisateur');
		const reason = interaction.options.getString('raison');

		// Check if the user has been warned
		const user = await Users.findOne({ where: { discord_identifier: unWarnedUser.id } });
		if (!user) {
			return interaction.reply({ content: 'This user has not been warned (user not in DB).', ephemeral: true });
		}
		const warnCount = await Punishments.count({ where: { fk_user: user.pk_user, type: 'warn' } });
		if (warnCount === 0) {
			return interaction.reply({ content: '⚠️This user has not been warned.', ephemeral: true });
		}

		const lastWarn = await Punishments.findOne({
			where: { fk_user: user.pk_user, type: 'warn' },
			order: [['createdAt', 'DESC']]
		});

		if (lastWarn) {
			await lastWarn.destroy();
		} else {
			return interaction.reply({ content: 'Could not find a warn to delete.', ephemeral: true });
		}

		// log the action
		await logModerationAction(interaction, unWarnedUser, interaction.user, reason, 'Warn Removed', '#00FF00'); // Green color for removal

		await interaction.reply({ content: `Removed warn for ${unWarnedUser.username}`, ephemeral: true });
	}
};