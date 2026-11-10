const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Punishments, Users } = require('#database');
const { logModerationAction } = require('#utils/loggerUtils');
const { CommandOptionsValidator, ValidationError } = require('#utils/validators');

module.exports = {
	staffOnly: true,
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('warn-remove')
		.setDescription('Retire le warn d\'un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur qui va perdre son warn').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison').setRequired(true)),
	async execute(interaction) {
		let unWarnedUser, reason;
		try {
			const validator = new CommandOptionsValidator(interaction);
			unWarnedUser = validator.getUser('utilisateur');
			reason = validator.getString('raison', null, {
				name: 'Raison',
				minLength: 3,
				maxLength: 500,
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.reply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
			}
			return interaction.reply({ content: 'Erreur lors de la validation des paramètres.', flags: MessageFlags.Ephemeral });
		}

		// Check if the user has been warned
		const user = await Users.findOne({ where: { discord_identifier: unWarnedUser.id } });
		if (!user) {
			return interaction.reply({ content: 'This user has not been warned (user not in DB).', flags: MessageFlags.Ephemeral });
		}
		const warnCount = await Punishments.count({ where: { fk_user: user.pk_user, type: 'warn' } });
		if (warnCount === 0) {
			return interaction.reply({ content: '⚠️This user has not been warned.', flags: MessageFlags.Ephemeral });
		}

		const lastWarn = await Punishments.findOne({
			where: { fk_user: user.pk_user, type: 'warn' },
			order: [['createdAt', 'DESC']],
		});

		if (lastWarn) {
			await lastWarn.destroy();
		} else {
			return interaction.reply({ content: 'Could not find a warn to delete.', flags: MessageFlags.Ephemeral });
		}

		// log the action
		// Green color for removal
		await logModerationAction(interaction, unWarnedUser, interaction.user, reason, 'Warn Removed', '#00FF00');

		await interaction.reply({ content: `Removed warn for ${unWarnedUser.username}`, flags: MessageFlags.Ephemeral });
	},
};