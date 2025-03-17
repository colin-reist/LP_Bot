const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Punishment, User } = require('../../../database/database.js');
const { log } = require('console');

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
			const reason = interaction.options.getString('raison');
			const staffMember = interaction.member.user;
			if (!staffMember) {
				return interaction.editReply({ content: 'Impossible de récupérer le responsable', ephemeral: true });
			}

			const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
			if (!interaction.member.roles.cache.has(requiredRole.id)) {
				return interaction.editReply({ content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
			}

			let user = await User.findOne({ where: { discord_identifier: warnedUser.id } });
			if (!user) {
				user = await User.create({
					discord_identifier: warnedUser.id,
					username: warnedUser.username,
				});
			}

			let punisher = await User.findOne({ where: { discord_identifier: staffMember.id } });
			if (!punisher) {
				punisher = await User.create({
					discord_identifier: staffMember.id,
					username: staffMember.username,
				});
			}

			console.log('user', user);
			await Punishment.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason: reason,
				type: 'warn',
			});

			const warnCount = await Punishment.count({ where: { fk_user: user.pk_user, type: 'warn' } });
			if (warnCount >= 3) {
				const member = await interaction.guild.members.fetch(warnedUser.id);
				await member.ban({ reason: 'A été warn 3 fois.' });
			}

			logWarn(interaction, warnedUser, staffMember, reason);

			await interaction.editReply({ content: `L'utilisateur <@${warnedUser.id}> a été averti pour la raison suivante : ${reason}`, ephemeral: true });
		} catch (error) {
			console.error('Erreur lors de l\'exécution de la commande warn :', error);
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
			{ name: 'Staff', value: `<@${staffMember.id}>`, inline: true }
		)
		.setTimestamp()
		.setThumbnail(warnedUser.displayAvatarURL());

	// Public log
	try {
		const publicLogChannel = interaction.guild.channels.cache.get('1164700276310155264'); // FIXME: Change channel ID
		if (!publicLogChannel) {
			throw new Error('Public log channel not found');
		}
		const message = 'L\'utilisateur <@' + warnedUser.id + '> a été averti pour la raison suivante : ';
		await publicLogChannel.send(message);
		await publicLogChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		console.error('Erreur lors du log public :', error);
	}

	// Admin log
	try {
		const adminLogWarnChannel = interaction.guild.channels.cache.get('1239286338256375898');
		await adminLogWarnChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		console.error('Erreur lors du log admin :', error);
	}
}