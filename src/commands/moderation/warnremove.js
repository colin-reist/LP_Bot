const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Punishments, Users } = require('#database');
const ids = require('#config/ids');
const { hasStaffRole } = require('#utils/permissionUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const logger = require('#logger');
const { CommandOptionsValidator, ValidationError } = require('#utils/validators');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Retire le warn d\'un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur qui va perdre son warn').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison').setRequired(true)),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
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

		let unWarnedUser, reason;
		try {
			const validator = new CommandOptionsValidator(interaction);
			unWarnedUser = validator.getUser('utilisateur');
			reason = validator.getString('raison', null, {
				name: 'Raison',
				minLength: 3,
				maxLength: 500
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
			}
			return interaction.reply({ content: 'Erreur lors de la validation des paramètres.', ephemeral: true });
		}

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