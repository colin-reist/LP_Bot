const { AuditLogEvent, Events } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { Users, Punishments } = require('../../../database/database.js');
const logger = require('../../logger.js');

/**
* Capte la modification des rôles d'un membre
* @param {GuildMember} oldMember Le membre avant la modification
* @param {GuildMember} newMember Le membre après la modification
* @returns
*/
module.exports = (client) => {
	client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
		if (!oldMember.roles.cache.has('965755928974618735') && newMember.roles.cache.has('965755928974618735')) {
			sendBoostBenefitsEmbed(newMember);
		}
	});
	client.on(Events.GuildBanAdd, handleBanUser);
};

async function handleBanUser(ban) {
	const { user, guild } = ban;
	let staffMember = null;
	let reason = ban.reason || 'Aucune raison fournie';

	try {
		await new Promise(resolve => setTimeout(resolve, 1000)); // évite les race conditions
		const fetchedLogs = await guild.fetchAuditLogs({
			limit: 5,
			type: AuditLogEvent.MemberBanAdd,
		});

		const banLog = fetchedLogs.entries.find(entry =>
			entry.target.id === user.id &&
			Date.now() - entry.createdTimestamp < 5000,
		);

		if (banLog) {
			reason = banLog.reason || reason;
			try {
				staffMember = await guild.members.fetch(banLog.executor.id);
			} catch {
				staffMember = null;
			}
		}
	} catch (error) {
		logger.error('Erreur lors de la récupération des logs d\'audit :', error);
	}

	await logBan(ban, user, staffMember, reason);
	await registerBan(user, staffMember, reason);
}

async function registerBan(bannedUser, staffMember, reason) {
	let user = await Users.findOne({ where: { discord_identifier: bannedUser.id } });
	try {
		if (!user) {
			user = await Users.create({
				discord_identifier: bannedUser.id,
				username: bannedUser.username,
			});
		}
	} catch (error) {
		logger.error('Erreur lors de l\'enregistrement de l\'utilisateur dans la base de données', error);
	}

	let punisher = await Users.findOne({ where: { discord_identifier: staffMember.id } });
	try {
		if (!punisher) {
			punisher = await Users.create({
				discord_identifier: staffMember.id,
				username: staffMember.username,
			});
		}
	} catch (error) {
		logger.error('Erreur lors du rajout du nouveau membre staff dans la base de données.', error);
	}

	try {
		await Punishments.create({
			fk_user: user.pk_user,
			fk_punisher: punisher.pk_user,
			reason: reason,
			type: 'ban',
		});
	} catch (error) {
		logger.error('Erreur lors de l\'enregistrement de la punition dans la base de données : ', error);
	}
}


async function logBan(interaction, bannedUser, staffMember, reason) {
	const banEmbed = new EmbedBuilder()
		.setColor('#FF0000')
		.setTitle('Ban')
		.setDescription('Un utilisateur a été banni')
		.addFields(
			{ name: 'Utilisateur', value: `<@${bannedUser.id}>`, inline: true },
			{ name: 'Raison', value: reason, inline: true },
			{ name: 'Staff', value: `<@${staffMember.id}>`, inline: true },
		)
		.setTimestamp()
		.setThumbnail(bannedUser.displayAvatarURL());

	// Public log
	try {
		const publicLogChannel = interaction.guild.channels.cache.get('1047244666262802463');
		const message = 'L\'utilisateur <@' + bannedUser.id + '> a été banni pour la raison suivante : ';
		await publicLogChannel.send(message);
		await publicLogChannel.send({ embeds: [banEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log public :', error);
	}

	// Admin log
	try {
		const adminLogWarnChannel = interaction.guild.channels.cache.get('1238537326427115592');
		await adminLogWarnChannel.send({ embeds: [banEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log admin :', error);
	}
}

function sendBoostBenefitsEmbed(member) {
	const channel = member.guild.channels.cache.get('1061643658723590164');
	if (!channel) {
		logger.error('Le salon boost est introuvable.');
		return;
	}

	channel.send(`🎉 Merci à <@${member.id}> d'avoir boosté le serveur !\n⬇️⬇️Tu peux regarder tes avangates en dessous !⬇️⬇️`);

	const embed = new EmbedBuilder()
		.setTitle('🎉🎉Merci de booster le serveur !🎉🎉')
		.setDescription('Voici les avantages que tu as débloqué en boostant le serveur :')
		.addFields(
			{
				name: '🔹 Un rôle unique',
				value: 'Tu as maintenant le droit à ton propre rôle ! \nIl te suffit de donner au staff le nom, la couleur et l\'image que tu veux. \nOuvre un ticket dans <#1251070987194077215> pour en discuter.',
				inline: false,
			},
			{
				name: '🔹 Boost d\'expérience (en développement)',
				value: 'Tu gagnes maintenant 1,1x plus d\'expérience à chaque message envoyé !',
				inline: false,
			},
			{
				name: '🔹 Des salons exclusifs',
				value: 'Tu as maintenant accès au salon vocal <#1066497879000227951> pour discuter avec les autres boosters ! \nTu as aussi accès au salon textuel <#1066497794799579136> pour discuter de tout et de rien.',
				inline: false,
			},
		)
		.setColor('#FF69B4')
		.setTimestamp();

	channel.send({ embeds: [embed] });
}