const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Punishments, Users } = require('../../../database/database.js');
const logger = require('../../logger.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Warn un utilisateur du serveur')
		.addUserOption(option =>
			option.setName('utilisateur')
				.setDescription('L\'utilisateur à warnir')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('raison')
				.setDescription('La raison du warn')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		try {
			const warnedUser = interaction.options.getUser('utilisateur');
			if (!warnedUser) {
				return interaction.editReply({ content: 'Impossible de récupérer l\'utilisateur, à t\'il quitté le serveur ?', ephemeral: true });
			}


			const reason = interaction.options.getString('raison');
			const staffMember = interaction.member.user;
			if (!staffMember) {
				return interaction.editReply({ content: 'Impossible de récupérer le responsable', ephemeral: true });
			}

			const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
			if (!interaction.member.roles.cache.has(requiredRole.id)) {
				return interaction.editReply({ content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
			}

			let user = await Users.findOne({ where: { discord_identifier: warnedUser.id } });
			if (!user) {
				user = await Users.create({
					discord_identifier: warnedUser.id,
					username: warnedUser.username,
				});
			}

			let punisher = await Users.findOne({ where: { discord_identifier: staffMember.id } });
			if (!punisher) {
				punisher = await Users.create({
					discord_identifier: staffMember.id,
					username: staffMember.username,
				});
			}

			logger.debug('user', user);
			await Punishments.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason: reason,
				type: 'warn',
			});

			const warnCount = await Punishments.count({ where: { fk_user: user.pk_user, type: 'warn' } });
			if (warnCount >= 3) {
				await interaction.guild.members.ban(warnedUser.id, { reason: reason });
			}

			logWarn(interaction, warnedUser, staffMember, reason);

			await interaction.editReply({ content: `L'utilisateur <@${warnedUser.id}> a été averti pour la raison suivante : ${reason}`, ephemeral: true });
		} catch (error) {
			logger.error('Erreur lors de l\'exécution de la commande warn :', error);
			await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
		}
	},
};

async function logWarn(interaction, warnedUser, staffMember, reason) {
	const warnEmbed = new EmbedBuilder()
		.setColor('#FF0000')
		.setTitle('Warn')
		.setDescription('Un utilisateur a été averti.')
		.addFields(
			{ name: 'Utilisateur', value: `<@${warnedUser.id}>`, inline: true },
			{ name: 'Raison', value: reason, inline: true },
			{ name: 'Staff', value: `<@${staffMember.id}>`, inline: true },
		)
		.setTimestamp()
		.setThumbnail(warnedUser.displayAvatarURL());

	// Public log
	try {
		const publicLogChannel = interaction.guild.channels.cache.get('1310662035436077198');
		if (!publicLogChannel) {
			throw new Error('Public log channel not found');
		}
		const message = 'L\'utilisateur <@' + warnedUser.id + '> a été averti pour la raison suivante : ';
		await publicLogChannel.send(message);
		await publicLogChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log public :', error);
	}

	// Admin log
	try {
		const adminLogWarnChannel = interaction.guild.channels.cache.get('1239286338256375898');
		await adminLogWarnChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log admin :', error);
	}
}