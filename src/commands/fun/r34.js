const { SlashCommandBuilder, MessageFlags } = require('discord.js');
// Node >= 21 fournit fetch nativement, pas besoin de node-fetch (qui n'était
// de toute façon pas déclaré en dépendance et faisait planter la commande).
const logger = require('#logger');
const { validateSearchTag, ValidationError } = require('#utils/validators');

// Configuration de la commande
const API_BASE_URL = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index';
const API_TIMEOUT = 5000; // 5 secondes
const MAX_TAG_LENGTH = 100;
const MAX_RESULTS = 900;
const BLACKLISTED_TAGS = ['-feral', '-scat', '-gore', '-ai_generated'];

// Depuis peu, l'API Rule34 exige des identifiants (obtenus sur
// https://rule34.xxx/index.php?page=account&s=options sous "API Access Credentials").
// Sans ces variables d'environnement, l'API répond "Missing authentication".
const R34_USER_ID = process.env.R34_USER_ID;
const R34_API_KEY = process.env.R34_API_KEY;
const AUTH_PARAMS = (R34_USER_ID && R34_API_KEY)
	? `&user_id=${encodeURIComponent(R34_USER_ID)}&api_key=${encodeURIComponent(R34_API_KEY)}`
	: '';

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

		// La réponse différée ci-dessus est publique : impossible de la rendre
		// ephemeral via editReply (Discord fixe le flag à la création de la
		// réponse). Pour les erreurs, on supprime donc la réponse "en attente"
		// et on envoie un followUp ephemeral à la place.
		const replyError = async (content) => {
			await interaction.deleteReply().catch(() => {});
			return interaction.followUp({ content, flags: MessageFlags.Ephemeral });
		};

		try {
			// 1. Validation et sanitization du tag avec validator
			const tag = validateSearchTag(interaction.options.getString('tag'), {
				name: 'Tag',
				maxLength: MAX_TAG_LENGTH
			});

			// 2. Construction de l'URL sécurisée
			const tagUrl = `&tags=${encodeURIComponent(tag)} ${BLACKLISTED_TAGS.join(' ')}`;
			const url = `${API_BASE_URL}&json=1&limit=${MAX_RESULTS}${tagUrl}${AUTH_PARAMS}`;

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
				return replyError('❌ L\'API Rule34 est temporairement indisponible.');
			}

			// 5. Parse JSON
			const data = await response.json();

			// 6. L'API renvoie un statut 200 avec une simple chaîne de texte
			// quand les identifiants (user_id/api_key) sont manquants ou invalides.
			if (typeof data === 'string') {
				logger.error(`R34 API authentication error: ${data}`);
				return replyError('❌ Configuration de l\'API Rule34 manquante ou invalide. Contactez un administrateur.');
			}

			// 7. Vérification des résultats
			if (!Array.isArray(data) || data.length === 0) {
				return replyError(`❌ Aucun résultat trouvé pour le tag: \`${tag}\``);
			}

			// 8. Sélection aléatoire
			const randomIndex = Math.floor(Math.random() * data.length);
			const result = data[randomIndex];

			// 9. Validation du résultat
			if (!result.file_url || typeof result.file_url !== 'string') {
				logger.error('R34 API returned invalid data structure');
				return replyError('❌ Format de réponse invalide de l\'API.');
			}

			// 10. Construction de la réponse
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
			// 11. Gestion d'erreurs détaillée
			if (error instanceof ValidationError) {
				return replyError(`❌ ${error.message}`);
			}

			if (error.name === 'AbortError') {
				logger.warn('R34 API timeout');
				return replyError('❌ L\'API a mis trop de temps à répondre. Réessayez.');
			}

			logger.error('R34 command error:', error);
			return replyError('❌ Une erreur est survenue lors de la recherche.');
		}
	},
};
