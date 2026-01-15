const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists } = require('#utils/databaseUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const { hasStaffRole } = require('#utils/permissionUtils');
const { CommandOptionsValidator, ValidationError } = require('#utils/validators');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option => option.setName('utilisateur').setDescription('La personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
			return interaction.editReply({
				content: '❌ Vous n\'avez pas la permission `Bannir des membres`.',
				ephemeral: true
			});
		}

		// Vérification Staff (en plus de Discord permissions)
		if (!hasStaffRole(interaction)) {
			return interaction.editReply({
				content: '❌ Vous devez avoir le rôle Staff.',
				ephemeral: true
			});
		}

		const validator = new CommandOptionsValidator(interaction);
		const bannedUser = validator.getUser('utilisateur');
		const reason = validator.getString('raison', null, {
			name: 'Raison',
			minLength: 3,
			maxLength: 500
		});
		const staffMember = interaction.member.user;

		if (!staffMember) {
			return interaction.editReply({ content: 'Impossible de récupérer le responsable', ephemeral: true });
		}

		// Creating DB entries and logging via Command to ensure reliability
		// We will need to update the Event handler to not re-log if it's already done.
		try {
			const user = await ensureUserExists(bannedUser.id, bannedUser.username);
			const punisher = await ensureUserExists(staffMember.id, staffMember.username);

			await Punishments.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason: reason,
				type: 'ban',
			});

			deleteAllUserMessages(interaction.guild, bannedUser.id);

			// Log
			await logModerationAction(interaction, bannedUser, staffMember, reason, 'Ban');

			// Actual Ban
			try {
				await interaction.guild.members.ban(bannedUser.id, { reason: reason });
			} catch (error) {
				logger.error('Erreur lors du ban de l\'utilisateur' + error);
				return interaction.editReply({ content: 'Erreur lors de la tentative de ban Discord: ' + error.message, ephemeral: true });
			}

			await interaction.editReply({ content: `L'utilisateur <@${bannedUser.id}> a été banni pour la raison suivante : ${reason}`, ephemeral: true });

		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.editReply({ content: `❌ ${error.message}`, ephemeral: true });
			}
			logger.error('Erreur lors de l\'enregistrement de la punition dans la base de données : ', error);
			interaction.editReply({ content: 'Erreur lors de l\'enregistrement de la punition dans la base de données', ephemeral: true });
		}
	},
};

async function deleteAllUserMessages(guild, userId) {
	const textChannels = guild.channels.cache.filter(
		channel => channel.isTextBased() && channel.permissionsFor(guild.members.me).has(['ViewChannel', 'ReadMessageHistory', 'ManageMessages']),
	);
	const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

	for (const [channelId, channel] of textChannels) {
		try {
			let fetchedMessages;
			do {
				// Récupérer jusqu'à 100 messages du canal
				fetchedMessages = await channel.messages.fetch({ limit: 100 });

				// Filtrer les messages de l'utilisateur et ceux qui datent de moins de 14 jours
				const userMessages = fetchedMessages.filter(
					msg => msg.author.id === userId && msg.createdTimestamp >= fourteenDaysAgo,
				);

				// Supprimer chaque message de l'utilisateur
				for (const msg of userMessages.values()) {
					await msg.delete();
				}

				// Arrêter la boucle si aucun message récent de l'utilisateur n'est trouvé
				if (userMessages.size === 0) break;

			} while (fetchedMessages.size >= 100);

			logger.debug(`Messages récents de l'utilisateur ${userId} supprimés dans le canal ${channel.name}.`);
		} catch (error) {
			logger.error(`Erreur lors de la suppression des messages dans le canal ${channel.name}:`, error);
		}
	}
}
