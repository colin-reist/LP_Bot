const { AuditLogEvent, Events } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { Users, Punishments } = require('#database');
const logger = require('#logger');
const ids = require('#config/ids');
const { wrapEventHandler } = require('../../utils/eventWrapper.js');

/**
 * Handler pour les mises à jour de membres (boost detection)
 */
async function handleGuildMemberUpdate(oldMember, newMember) {
	// Détection d'un nouveau boost
	if (!oldMember.roles.cache.has(ids.roles.boost) &&
		newMember.roles.cache.has(ids.roles.boost)) {
		await sendBoostBenefitsEmbed(newMember);
	}

	// Annonce de rôle : envoie un message dans un salon dédié quand un rôle configuré est obtenu
	const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
	for (const roleId of addedRoles.keys()) {
		const announcement = ids.roleAnnouncements?.[roleId];
		if (announcement) {
			await sendRoleAnnouncement(newMember, announcement);
		}
	}
}

/**
 * Module export avec wrappers de gestion d'erreurs
 */
module.exports = (client) => {
	// Wrapper pour GuildMemberUpdate
	const wrappedMemberUpdate = wrapEventHandler(
		Events.GuildMemberUpdate,
		handleGuildMemberUpdate,
		{ logExecution: false, timeout: 10000 }
	);

	// Wrapper pour GuildBanAdd
	const wrappedBanAdd = wrapEventHandler(
		Events.GuildBanAdd,
		handleBanUser,
		{ logExecution: true, timeout: 15000 }
	);

	client.on(Events.GuildMemberUpdate, wrappedMemberUpdate);
	client.on(Events.GuildBanAdd, wrappedBanAdd);
};

async function handleBanUser(ban) {
	const { user, guild } = ban;
	let staffMember = null;
	let reason = ban.reason || 'Aucune raison fournie';

	// Wait a bit to ensure Audit Logs are generated
	try {
		await new Promise(resolve => setTimeout(resolve, 1000));
		const fetchedLogs = await guild.fetchAuditLogs({
			limit: 5,
			type: AuditLogEvent.MemberBanAdd,
		});

		const banLog = fetchedLogs.entries.find(entry =>
			entry.target.id === user.id &&
			Date.now() - entry.createdTimestamp < 10000, // 10s window
		);

		if (banLog) {
			reason = banLog.reason || reason;
			try {
				staffMember = await guild.members.fetch(banLog.executor.id);
			} catch {
				staffMember = null; // Could happen if executor left?
			}
		}
	} catch (error) {
		logger.error('Erreur lors de la récupération des logs d\'audit :', error);
	}

	// Default punishment executor if unknown (e.g. Bot itself if needed, or Unknown)
	// If staffMember is null, we can't create a 'User' for them easily unless we have at least an ID.
	// However, if the ban came from the command, the Punishments entry ALREADY exists.

	// Check if punishment already exists (created by command within last 10s)
	try {
		const { ensureUserExists } = require('#utils/databaseUtils');
		const userDb = await ensureUserExists(user.id, user.username);

		const { Op } = require('sequelize');
		const tenSecondsAgo = new Date(Date.now() - 10000);

		const recentBan = await Punishments.findOne({
			where: {
				fk_user: userDb.pk_user,
				type: 'ban',
				createdAt: { [Op.gte]: tenSecondsAgo }
			}
		});

		if (recentBan) {
			logger.debug(`Ban check: Punishment already registered for ${user.tag} (likely via command). Skipping event logging.`);
			return;
		}

		// If we are here, it's a manual ban (Right click -> Ban)
		// We need to register it.
		if (staffMember) {
			const { logModerationAction } = require('#utils/loggerUtils');
			const punisherDb = await ensureUserExists(staffMember.id, staffMember.user.username);

			await Punishments.create({
				fk_user: userDb.pk_user,
				fk_punisher: punisherDb.pk_user,
				reason: reason,
				type: 'ban',
			});

			// We need a context for logModerationAction that has 'guild'. 
			// The function expects 'interaction', but uses 'interaction.guild'.
			// Pass a mock object with guild.
			await logModerationAction({ guild: guild }, user, staffMember.user, reason, 'Ban');
		} else {
			logger.warn(`Manual ban detected for ${user.tag} but could not identify staff member. Skipping DB/Log to avoid bad data.`);
		}

	} catch (error) {
		logger.error('Error handling GuildBanAdd event:', error);
	}
}

async function sendRoleAnnouncement(member, announcement) {
	try {
		const channel = member.guild.channels.cache.get(announcement.channel);
		if (!channel) {
			logger.error(`Le salon d'annonce de rôle est introuvable (channel: ${announcement.channel}).`);
			return;
		}

		const message = announcement.message.replace('{mention}', `<@${member.id}>`);
		await channel.send(message);
	} catch (error) {
		logger.error('Erreur lors de l\'envoi de l\'annonce de rôle:', error);
	}
}

async function sendBoostBenefitsEmbed(member) {
	try {
		const channel = member.guild.channels.cache.get(ids.channels.boosters);
		if (!channel) {
			logger.error('Le salon boost est introuvable.');
			return;
		}

		await channel.send(`🎉 Merci à <@${member.id}> d'avoir boosté le serveur !\n⬇️⬇️Tu peux regarder tes avangates en dessous !⬇️⬇️`);

		const embed = new EmbedBuilder()
			.setTitle('🎉🎉Merci de booster le serveur !🎉🎉')
			.setDescription('Voici les avantages que tu as débloqué en boostant le serveur :')
			.addFields(
				{
					name: '🔹 Un rôle unique',
					value: 'Tu as maintenant le droit à ton propre rôle ! \nIl te suffit de donner au staff le nom, la couleur et l\'image que tu veux. \nOuvre un ticket dans <#' + ids.channels.tickets + '> pour en discuter.',
					inline: false,
				},
				{
					name: '🔹 Boost d\'expérience (en développement)',
					value: 'Tu gagnes maintenant 1,1x plus d\'expérience à chaque message envoyé !',
					inline: false,
				},
				{
					name: '🔹 Des salons exclusifs',
					value: 'Tu as maintenant accès au salon vocal <#' + ids.channels.voiceBoosters + '> pour discuter avec les autres boosters ! \nTu as aussi accès au salon textuel <#' + ids.channels.textBoosters + '> pour discuter de tout et de rien.',
					inline: false,
				},
			)
			.setColor('#FF69B4')
			.setTimestamp();

		await channel.send({ embeds: [embed] });
	} catch (error) {
		logger.error('Erreur lors de l\'envoi du message de boost:', error);
	}
}