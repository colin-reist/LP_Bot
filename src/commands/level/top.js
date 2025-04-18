const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');

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
				limit: 10,
			});

			if (!users) {
				return await interaction.reply({ content: '❌ Aucun utilisateur n\'est enregistré dans le système.', ephemeral: true });
			}

			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('🔹 Classement des membres par expérience')
				.setThumbnail(interaction.guild.iconURL({ dynamic: true }))
				.setFooter({ text: 'Continuez à participer pour gagner plus d\'XP !' })
				.setTimestamp();

			users.forEach((user, index) => {
				embed.addFields({ name: `🥇 #${index + 1}`, value: `** <@${user.discord_identifier}>** \n**${user.experience}** points \n**niveau ${getLevelFromXP(user.experience)}**`, inline: true });
			});

			// Si l'utilisateur n'est pas dans le top 10
			let user = users.find(user => user.discord_identifier === interaction.user.id);
			if (!user) {
				user = await Users.findOne({
					where: sequelize.where(sequelize.cast(sequelize.col('discord_identifier'), 'TEXT'), interaction.user.id),
				});

				if (user) {
					embed.addFields({ name: `🔹 <@${user.discord_identifier}>`, value: `**${user.experience}** points`, inline: false });
				}
			}

			await interaction.reply({ embeds: [embed], ephemeral: false });
		} catch (error) {
			logger.error('Erreur lors de la récupération du classement des membres :\n', error);
			await interaction.reply({ content: '⚠️ Erreur lors de l\'exécution de la commande.\nMerci de prévenir le staff.', ephemeral: true });
		}
	},
};

function getLevelFromXP(xp) {
	let level = 0;
	while (true) {
		const requiredXP = 50 * level ** 2 + 50 * level + 100;
		if (xp < requiredXP) break;
		xp -= requiredXP;
		level++;
	}
	return level;
}
