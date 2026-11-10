const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists } = require('#utils/databaseUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const { CommandOptionsValidator, ValidationError } = require('#utils/validators');

module.exports = {
	staffOnly: true,
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kick un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.addUserOption(option =>
			option.setName('utilisateur')
				.setDescription('Mention ou ID de l\'utilisateur à kick')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('raison')
				.setDescription('La raison du kick')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const validator = new CommandOptionsValidator(interaction);
		const kickedUser = validator.getUser('utilisateur');
		const reason = validator.getString('raison', null, {
			name: 'Raison',
			minLength: 3,
			maxLength: 500,
		});
		const staffMember = interaction.member.user;

		await interaction.editReply({ content: 'Traitement du kick en cours...', flags: MessageFlags.Ephemeral });

		try {
			const user = await ensureUserExists(kickedUser.id, kickedUser.username);
			const punisher = await ensureUserExists(staffMember.id, staffMember.username);

			await Punishments.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason: reason,
				type: 'kick',
			});

			// Kick l'utilisateur
			try {
				await interaction.guild.members.kick(kickedUser.id, { reason: reason });
			} catch (error) {
				logger.error('Erreur lors du kick de l\'utilisateur :', error);
				return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', flags: MessageFlags.Ephemeral });
			}

			await logModerationAction(interaction, kickedUser, staffMember, reason, 'Kick');
			return interaction.editReply({ content: `L'utilisateur <@${kickedUser.id}> a été kick pour la raison suivante : ${reason}` });

		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.editReply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
			}
			logger.error(error);
			return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', flags: MessageFlags.Ephemeral });
		}
	},
};