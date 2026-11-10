const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { Op } = require('sequelize');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');
const { getLevelFromXP } = require('../../utils/levels.js');

const TOP_SIZE = 9;
const BATCH_SIZE = 50;
const MAX_BATCHES = 5;

/**
 * Récupère les meilleurs utilisateurs encore présents sur le serveur.
 * Les bannis sont exclus en SQL (identifiant négatif après anonymisation),
 * les membres partis sont filtrés via un fetch groupé des membres.
 */
async function getTopPresentMembers(guild) {
	const result = [];

	for (let batch = 0; batch < MAX_BATCHES && result.length < TOP_SIZE; batch++) {
		const rows = await Users.findAll({
			where: { discord_identifier: { [Op.gt]: 0 } },
			order: [['experience', 'DESC']],
			limit: BATCH_SIZE,
			offset: batch * BATCH_SIZE,
		});
		if (rows.length === 0) break;

		const ids = rows.map(u => String(u.discord_identifier));
		const members = await guild.members.fetch({ user: ids });

		for (const row of rows) {
			if (members.has(String(row.discord_identifier))) {
				result.push(row);
				if (result.length === TOP_SIZE) break;
			}
		}

		if (rows.length < BATCH_SIZE) break;
	}

	return result;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('top')
		.setDescription('Affiche le classement des membres par expérience'),
	async execute(interaction) {
		try {
			await interaction.deferReply();

			const users = await getTopPresentMembers(interaction.guild);

			if (users.length === 0) {
				return await interaction.editReply({ content: '❌ Aucun utilisateur n\'est enregistré dans le système.' });
			}

			const embed = new EmbedBuilder()
				.setColor('#3498db')
				.setTitle('🔹 Classement des membres par expérience')
				.setThumbnail(interaction.guild.iconURL({ dynamic: true }))
				.setFooter({ text: 'Continuez à participer pour gagner plus d\'XP !' })
				.setTimestamp();

			users.forEach((user, index) => {
				embed.addFields({ name: `🥇 #${index + 1}`, value: `** <@${user.discord_identifier}>** \n**${user.experience}** points \nNiveau **${getLevelFromXP(user.experience)}**`, inline: true });
			});

			if (!users.some(u => String(u.discord_identifier) === interaction.user.id)) {
				const user = await Users.findOne({
					where: sequelize.where(sequelize.cast(sequelize.col('discord_identifier'), 'CHAR'), interaction.user.id),
				});

				if (user) {
					embed.addFields({ name: '🔹 Ta position', value: `<@${user.discord_identifier}> — **${user.experience}** points`, inline: false });
				}
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.error('Erreur lors de la récupération du classement des membres :\n', error);
			const payload = { content: '⚠️ Erreur lors de l\'exécution de la commande.\nMerci de prévenir le staff.' };
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(payload).catch(() => {});
			} else {
				await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => {});
			}
		}
	},
};
