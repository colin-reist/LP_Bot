const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Punishment, User } = require('../../../database/database.js');

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
		try {
			// Récupérer les options
			const warnedUser = interaction.options.getUser('utilisateur');
			const reason = interaction.options.getString('raison');
			const staffMember = interaction.member.user;

			// check if the user has the required permissions
			const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
			if (!interaction.member.roles.cache.has(requiredRole.id)) {
				return interaction.editReply({ content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
			}

			// Add the warn to the database
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

			// Check if the user has been warned 3 times
			const warnCount = await Punishment.count({ where: { fk_user: user.pk_user, type: 'warn' } });
			if (warnCount >= 3) {
				const member = await interaction.guild.members.fetch(warnedUser.id);
				await member.ban({ reason: 'A été warn 3 fois.' });
			}

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
				const publicLogChannel = interaction.guild.channels.cache.get('1164700276310155264'); // Replace with the real ID
				const message = 'L\'utilisateur <@'+ warnedUser.id  + '> a été averti pour la raison suivante : ';
				await publicLogChannel.send(message);
				await publicLogChannel.send({ embeds: [warnEmbed] });
			} catch (error) {
				console.error('Erreur lors du log public :', error);
			}

			// Admin log
			try{
				const adminLogWarnChannel = interaction.guild.channels.cache.get('1239286338256375898'); 
				await adminLogWarnChannel.send({ embeds: [warnEmbed] });
			} catch (error) {
				console.error('Erreur lors du log admin :', error);
			}
		} catch (error) {
			console.error('Erreur lors de l\'exécution de la commande warn :', error);
			if (!interaction.replied) {
				await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
			}
		}
	},
};
