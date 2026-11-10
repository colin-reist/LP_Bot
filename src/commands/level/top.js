const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');
const { getLevelFromXP } = require('../../utils/levels.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('top')
		.setDescription('Affiche le classement des membres par expérience'),
	async execute(interaction) {
		try {
			const users = await Users.findAll({
				order: [
					['experience', 'DESC'],
				],
				limit: 9,
			});

			if (!users) {
				return await interaction.reply({ content: '❌ Aucun utilisateur n\'est enregistré dans le système.', flags: MessageFlags.Ephemeral });
			}

			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('🔹 Classement des membres par expérience')
				.setThumbnail(interaction.guild.iconURL({ dynamic: true }))
				.setFooter({ text: 'Continuez à participer pour gagner plus d\'XP !' })
				.setTimestamp();

			users.forEach((user, index) => {
				embed.addFields({ name: `🥇 #${index + 1}`, value: `** <@${user.discord_identifier}>** \n**${user.experience}** points \nNiveau **${getLevelFromXP(user.experience)}**`, inline: true });
			});

			let user = users.find(u => u.discord_identifier === interaction.user.id);
			if (!user) {
				user = await Users.findOne({
					where: sequelize.where(sequelize.cast(sequelize.col('discord_identifier'), 'TEXT'), interaction.user.id),
				});

				if (user) {
					embed.addFields({ name: `🔹 <@${user.discord_identifier}>`, value: `**${user.experience}** points`, inline: false });
				}
			}

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			logger.error('Erreur lors de la récupération du classement des membres :\n', error);
			await interaction.reply({ content: '⚠️ Erreur lors de l\'exécution de la commande.\nMerci de prévenir le staff.', flags: MessageFlags.Ephemeral });
		}
	},
};
