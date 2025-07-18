const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Users, Punishments } = require('../../../database/database.js');
const logger = require('../../logger.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.addUserOption(option => option.setName('utilisateur').setDescription('La personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true))
		.setDescription('Ban un utilisateur du serveur'),
	async execute(interaction) {
		const bannedUser = interaction.options.getUser('utilisateur');
		const reason = interaction.options.getString('raison');
		const staffMember = interaction.member.user;

		await interaction.deferReply({ ephemeral: true });

		if (!staffMember) {
			return interaction.editReply({ content: 'Impossible de récupérer le responsable', ephemeral: true });
		}

		const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
		if (!interaction.member.roles.cache.has(requiredRole.id)) {
			return interaction.editReply({ content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
		}

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
			interaction.editReply({ content: 'Erreur lors de l\'enregistrement de l\'utilisateur dans la base de données', ephemeral: true });
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
			interaction.editReply({ content: 'Erreur lors du rajout du nouveau membre staff dans la base de données.', ephemeral: true });
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
			interaction.editReply({ content: 'Erreur lors de l\'enregistrement de la punition dans la base de données', ephemeral: true });
		}

		deleteAllUserMessages(interaction.guild, bannedUser.id);

		// logBan(interaction, bannedUser, staffMember, reason);

		// Ban l'utilisateur
		try {
			await interaction.guild.members.ban(bannedUser.id, { reason: reason });
		} catch (error) {
			logger.error('Erreur lors du ban de l\'utilisateur' + error);
		}

		await interaction.editReply({ content: `L'utilisateur <@${bannedUser.id}> a été banni pour la raison suivante : ${reason}`, ephemeral: true });
	},
};

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
		const publicLogChannel = interaction.guild.channels.cache.get('1310662035436077198');
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
