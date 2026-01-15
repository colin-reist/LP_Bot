const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('#logger');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('health')
		.setDescription('Affiche l\'état de santé du bot')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(interaction) {
		// Double vérification des permissions
		if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Administrateur`.',
				ephemeral: true
			});
		}

		await interaction.deferReply({ ephemeral: true });

		try {
			// Récupère le healthCheck depuis le client
			const healthCheck = interaction.client.healthCheck;

			if (!healthCheck) {
				return interaction.editReply({
					content: '❌ Le système de health check n\'est pas initialisé.',
					ephemeral: true
				});
			}

			// Effectue un check en temps réel
			await healthCheck.performCheck();

			// Récupère le rapport
			const report = healthCheck.getHealthReport();
			const status = healthCheck.getStatus();

			// Détermine la couleur selon le status
			const color = healthCheck.isHealthy() ? '#00FF00' :
				(status.bot === 'unhealthy' || status.database === 'unhealthy' || status.discord === 'unhealthy') ?
					'#FF0000' : '#FFA500';

			// Crée l'embed
			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle('🏥 Bot Health Check')
				.setDescription(report.status)
				.addFields(
					{
						name: '🤖 Bot Status',
						value: report.components.bot,
						inline: true
					},
					{
						name: '💾 Database',
						value: report.components.database,
						inline: true
					},
					{
						name: '🌐 Discord API',
						value: report.components.discord,
						inline: true
					},
					{
						name: '⏱️ Uptime',
						value: report.uptime,
						inline: true
					},
					{
						name: '🧠 Memory',
						value: report.memory,
						inline: true
					},
					{
						name: '📊 Metrics',
						value: `Commands: ${report.metrics.commandsExecuted}\nErrors: ${report.metrics.errors}\nEvents: ${report.metrics.eventsProcessed}`,
						inline: true
					}
				)
				.setFooter({ text: `Last check: ${report.lastCheck}` })
				.setTimestamp();

			// Ajoute des détails si dégradé/unhealthy
			if (!healthCheck.isHealthy()) {
				if (status.discord === 'degraded') {
					embed.addFields({
						name: '⚠️ Discord Latency',
						value: `${interaction.client.ws.ping}ms`,
						inline: false
					});
				}

				if (status.checkDuration > 2000) {
					embed.addFields({
						name: '⚠️ Check Duration',
						value: `${status.checkDuration}ms (slow)`,
						inline: false
					});
				}
			}

			await interaction.editReply({ embeds: [embed], ephemeral: true });

		} catch (error) {
			logger.error('Erreur lors de l\'exécution de la commande health:', error);
			await interaction.editReply({
				content: '❌ Une erreur est survenue lors du health check.',
				ephemeral: true
			});
		}
	},
};
