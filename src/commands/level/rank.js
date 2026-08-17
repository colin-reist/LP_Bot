const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rank')
		.setDescription('Te donne ton niveau d\'expérience'),
	async execute(interaction) {
		try {
			const user = await Users.findOne({
				where: sequelize.where(sequelize.cast(sequelize.col('discord_identifier'), 'TEXT'), interaction.user.id),
			});

			if (!user) {
				return await interaction.reply({ content: '❌ Tu n\'es pas encore enregistré dans le système.', flags: MessageFlags.Ephemeral });
			}

			const level = getLevelFromXP(user.experience);

			// Création de l'embed
			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle(`🔹 Niveau d'expérience de ${interaction.user.username}`)
				.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
				.addFields(
					{ name: '👤 Utilisateur', value: `<@${interaction.user.id}>`, inline: true },
					{ name: '🏆 Expérience', value: `**${user.experience}** points`, inline: true },
					{ name: '🏅 Niveau', value: `**${level}** niveaux`, inline: true },
					{ name: '📅 Inscrit le', value: `<t:${Math.floor(user.createdAt / 1000)}:D>`, inline: false },
				)
				.setFooter({ text: 'Continue à participer pour gagner plus d\'XP !' })
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });

		} catch (error) {
			await interaction.reply({ content: '⚠️ Erreur lors de l\'exécution de la commande.\nMerci de prévenir le staff.', flags: MessageFlags.Ephemeral });
			logger.error('Erreur lors de la récupération de l\'expérience de l\'utilisateur :\n', error);
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