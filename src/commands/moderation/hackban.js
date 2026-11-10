const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists, anonymizeUser } = require('#utils/databaseUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const { CommandOptionsValidator, ValidationError, validateDiscordId } = require('#utils/validators');

module.exports = {
	staffOnly: true,
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('hackban')
		.setDescription('Ban un utilisateur qui n\'est pas sur le serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption(option => option.setName('id').setDescription('L\'identifiant de la personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		let targetId;
		let reason;
		try {
			const validator = new CommandOptionsValidator(interaction);
			targetId = validator.getString('id', validateDiscordId);
			reason = validator.getString('raison', null, {
				name: 'Raison',
				minLength: 3,
				maxLength: 500,
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.editReply({ content: `❌ ${error.message}` });
			}
			throw error;
		}

		// Récupère le compte Discord (fonctionne même si la personne n'est pas sur le serveur)
		let targetUser;
		try {
			targetUser = await interaction.client.users.fetch(targetId);
		} catch {
			return interaction.editReply({ content: `❌ Aucun compte Discord trouvé pour l'ID \`${targetId}\`.` });
		}

		const staffUser = interaction.user;

		try {
			// Enregistré avant le ban pour que l'event GuildBanAdd ne le compte pas une 2e fois
			const user = await ensureUserExists(targetUser.id, targetUser.username);
			const punisher = await ensureUserExists(staffUser.id, staffUser.username);
			await Punishments.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason,
				type: 'ban',
			});

			await interaction.guild.members.ban(targetUser.id, { reason });
			await logModerationAction(interaction, targetUser, staffUser, reason, 'Ban');
			await anonymizeUser(user);
		} catch (error) {
			logger.error('Erreur lors du hackban :', error);
			return interaction.editReply({ content: `❌ Erreur lors du ban : ${error.message}` });
		}

		await interaction.editReply({ content: `L'utilisateur <@${targetUser.id}> a été banni pour la raison suivante : ${reason}` });
	},
};
