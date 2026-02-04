const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const logger = require('#logger');
const { validateSearchTag, ValidationError } = require('#utils/validators');

// Configuration de la commande
const API_BASE_URL = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index';
const API_TIMEOUT = 5000; // 5 secondes
const MAX_TAG_LENGTH = 100;
const MAX_RESULTS = 900;
const BLACKLISTED_TAGS = ['-feral', '-scat', '-gore', '-ai_generated'];

module.exports = {
	category: 'fun',
	cooldown: 5, // Augmentation du cooldown à 5 secondes
	data: new SlashCommandBuilder()
		.setName('r34')
		.setDescription('Récupère une image de Rule34')
		.addStringOption(option =>
			option.setName('tag')
				.setDescription('Le tag à rechercher')
				.setRequired(true)),

	async execute(interaction) {
		await interaction.deferReply();

		try {
			// 1. Validation et sanitization du tag avec validator
			const tag = validateSearchTag(interaction.options.getString('tag'), {
				name: 'Tag',
				maxLength: MAX_TAG_LENGTH
			});

			// 2. Construction de l'URL sécurisée
			const tagUrl = `&tags=${encodeURIComponent(tag)} ${BLACKLISTED_TAGS.join(' ')}`;
			const url = `${API_BASE_URL}&json=1&limit=${MAX_RESULTS}${tagUrl}`;

			logger.debug(`R34 API call: ${url}`);

			// 3. Fetch avec timeout et abort controller
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

			let response;
			try {
				response = await fetch(url, {
					signal: controller.signal,
					headers: { 'User-Agent': 'LP_Bot/1.0' }
				});
			} finally {
				clearTimeout(timeout);
			}

			// 4. Vérification du statut HTTP
			if (!response.ok) {
				logger.warn(`R34 API error: ${response.status} ${response.statusText}`);
				return interaction.editReply({
					content: '❌ L\'API Rule34 est temporairement indisponible.',
					ephemeral: true
				});
			}

			// 5. Parse JSON
			const data = await response.json();

			// 6. Vérification des résultats
			if (!Array.isArray(data) || data.length === 0) {
				return interaction.editReply({
					content: `❌ Aucun résultat trouvé pour le tag: \`${tag}\``,
					ephemeral: true
				});
			}

			// 7. Sélection aléatoire
			const randomIndex = Math.floor(Math.random() * data.length);
			const result = data[randomIndex];

			// 8. Validation du résultat
			if (!result.file_url || typeof result.file_url !== 'string') {
				logger.error('R34 API returned invalid data structure');
				return interaction.editReply({
					content: '❌ Format de réponse invalide de l\'API.',
					ephemeral: true
				});
			}

			// 9. Construction de la réponse
			if (result.file_url.includes('.mp4') || result.file_url.includes('.webm')) {
				// Vidéo
				await interaction.editReply({
					content: `>>> **[Rule34](https://rule34.xxx/)** \n**Tag(s):** ${tag}\n[Lien vers la vidéo](${result.file_url})`
				});
			} else {
				// Image
				const embed = {
					color: 0x00ff00,
					title: 'Rule34',
					url: 'https://rule34.xxx/',
					description: 'Résultat de recherche Rule34',
					thumbnail: {
						url: 'https://rule34.xxx/favicon.ico',
					},
					fields: [
						{
							name: 'Tag(s) recherché(s)',
							value: tag,
						},
					],
					image: {
						url: result.file_url,
					},
					footer: {
						text: 'Lewd Paradise',
						icon_url: interaction.guild.iconURL(),
					},
				};

				await interaction.editReply({ embeds: [embed] });
			}

			logger.debug(`R34 command success for tag: ${tag}`);

		} catch (error) {
			// 10. Gestion d'erreurs détaillée
			if (error instanceof ValidationError) {
				return interaction.editReply({
					content: `❌ ${error.message}`,
					ephemeral: true
				});
			}

			if (error.name === 'AbortError') {
				logger.warn('R34 API timeout');
				return interaction.editReply({
					content: '❌ L\'API a mis trop de temps à répondre. Réessayez.',
					ephemeral: true
				});
			}

			logger.error('R34 command error:', error);
			return interaction.editReply({
				content: '❌ Une erreur est survenue lors de la recherche.',
				ephemeral: true
			});
		}
	},
};
