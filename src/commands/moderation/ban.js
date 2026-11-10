const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists, anonymizeUser } = require('#utils/databaseUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const { CommandOptionsValidator, ValidationError } = require('#utils/validators');

module.exports = {
	staffOnly: true,
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban un utilisateur du serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option => option.setName('utilisateur').setDescription('La personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true).setAutocomplete(true)),
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused().toLowerCase();
		const predefinedReasons = [
			'Non respect des règles du serveur',
			'Comportement toxique / harcèlement',
			'Spam / publicité non autorisée',
			'Contenu inapproprié',
			'Menaces / intimidation',
			'Usurpation d\'identité',
			'Contournement d\'un ban',
		];
		const filtered = predefinedReasons.filter(r => r.toLowerCase().includes(focused));
		await interaction.respond(filtered.map(r => ({ name: r, value: r })));
	},
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const validator = new CommandOptionsValidator(interaction);
		const bannedUser = validator.getUser('utilisateur');
		const reason = validator.getString('raison', null, {
			name: 'Raison',
			minLength: 3,
			maxLength: 500,
		});
		const staffMember = interaction.member.user;

		if (!staffMember) {
			return interaction.editReply({ content: 'Impossible de récupérer le responsable', flags: MessageFlags.Ephemeral });
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

			deleteAllUserMessages(interaction.guild, bannedUser.id)
				.catch(error => logger.error('Erreur lors de la purge des messages :', error));

			// Log
			await logModerationAction(interaction, bannedUser, staffMember, reason, 'Ban');

			// Actual Ban
			try {
				await interaction.guild.members.ban(bannedUser.id, { reason: reason });
			} catch (error) {
				logger.error('Erreur lors du ban de l\'utilisateur' + error);
				return interaction.editReply({ content: 'Erreur lors de la tentative de ban Discord: ' + error.message, flags: MessageFlags.Ephemeral });
			}

			await anonymizeUser(user);

			await interaction.editReply({ content: `L'utilisateur <@${bannedUser.id}> a été banni pour la raison suivante : ${reason}`, flags: MessageFlags.Ephemeral });

		} catch (error) {
			if (error instanceof ValidationError) {
				return interaction.editReply({ content: `❌ ${error.message}`, flags: MessageFlags.Ephemeral });
			}
			logger.error('Erreur lors de l\'enregistrement de la punition dans la base de données : ', error);
			interaction.editReply({ content: 'Erreur lors de l\'enregistrement de la punition dans la base de données', flags: MessageFlags.Ephemeral });
		}
	},
};

/**
 * Supprime les messages des 14 derniers jours d'un utilisateur dans tous les salons
 * accessibles. Pagine avec `before` jusqu'à atteindre des messages de plus de 14 jours
 * (limite de bulkDelete), puis supprime par lots de 100 maximum.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 */
async function deleteAllUserMessages(guild, userId) {
	const textChannels = guild.channels.cache.filter(
		channel => channel.isTextBased() && channel.permissionsFor(guild.members.me)?.has(['ViewChannel', 'ReadMessageHistory', 'ManageMessages']),
	);
	// Petite marge sous les 14 jours pour que bulkDelete ne refuse pas les plus anciens
	const cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000 - 60 * 1000);
	let total = 0;

	for (const channel of textChannels.values()) {
		try {
			let before;
			let reachedCutoff = false;

			while (!reachedCutoff) {
				const batch = await channel.messages.fetch({ limit: 100, before, cache: false });
				if (batch.size === 0) break;

				const toDelete = batch.filter(msg => msg.author.id === userId && msg.createdTimestamp >= cutoff);
				if (toDelete.size > 0) {
					const deleted = await channel.bulkDelete(toDelete, true);
					total += deleted.size;
				}

				const oldest = batch.last();
				reachedCutoff = batch.size < 100 || oldest.createdTimestamp < cutoff;
				before = oldest.id;
			}
		} catch (error) {
			logger.error(`Erreur lors de la suppression des messages dans le canal ${channel.name}:`, error);
		}
	}

	logger.debug(`${total} message(s) de l'utilisateur ${userId} supprimé(s).`);
}
