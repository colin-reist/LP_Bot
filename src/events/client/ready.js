const { Events, ActivityType, EmbedBuilder } = require('discord.js'); // Importer Events
const { Concours } = require('../../../database/database'); // Importer la table Tags
const cron = require('cron'); // Importer cron
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');

module.exports = (client) => {

	const crashLogsChannelId = ids.channels.logs; // ID du channel où envoyer les logs de crash

	process.on('uncaughtException', async (error) => {
		logger.error('An unCaugth error has been detected :', error.stack ?? error);
		logger.error(error.message ?? 'No message available');

		try {
			const errorEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ UnCaught Error ❌')
				.setDescription(`An uncaugth error has been detected : \n\n\`\`\`${error}\`\`\``)
				.addFields({
					name: '🔧 Stack trace 🔧',
					value: `\`\`\`${error.stack}\`\`\``,
				})
				.setImage('https://media1.tenor.com/m/sIB-6LgziVIAAAAC/spongebob-squarepants-spongebob.gif')
				.setFooter({
					text: 'Lewd Paradise au service de tout les hornys',
					iconURL: 'https://i.imgur.com/PQtvZLa.gif',
				});

			// Remplace "ID_DU_CHANNEL" par l'ID du channel où tu veux envoyer le message
			const channel = client.channels.cache.get(crashLogsChannelId);
			if (channel && channel.isTextBased()) {
				await channel.send('<@' + ids.users.dev + '> Tu sais pas coder')
				await channel.send({ embeds: [errorEmbed] });
			}
		} catch (err) {
			logger.error('Impossible d\'envoyer le message d\'erreur non géré :' + err);
		}
	});

	function startBotLog() {
		const startEmbed = new EmbedBuilder()
			.setColor('#00FF00')
			.setTitle('✅ Bot started ✅')
			.setDescription('The bot has been started successfully !')
			.setImage('https://i.imgur.com/3fUmg6N.png')
			.setFooter({
				text: 'Lewd Paradise au service de tout les hornys',
				iconURL: 'https://i.imgur.com/PQtvZLa.gif',
			});

		const channel = client.channels.cache.get(crashLogsChannelId);
		if (channel && channel.isTextBased()) {
			channel.send({ embeds: [startEmbed] });
		} else {
			logger.error('Impossible d\'envoyer le message de démarrage du bot');
		}
	}

	/**
	 * Tableau des status du bot
	 */
	const status = [
		{
			type: ActivityType.Playing,
			name: 'Compte le nombre de votes',
		},
		{
			type: ActivityType.Watching,
			name: 'qui est qualifié',
		},
		{
			name: '.gg/lewd.paradise',
			type: ActivityType.Playing,
			url: 'https://discord.gg/lewd.paradise',
		},
	];

	/**
	 * Event start of the bot
	 * Utilise ClientReady au lieu de ready (déprécié en v15)
	 */
	client.once(Events.ClientReady, () => {
		startBotLog();

		setInterval(() => {
			const index = Math.floor(Math.random() * (status.length - 1) + 1);
			client.user.setActivity(status[index].name, { type: status[index].type });
		}, 600000);

		// concours(); // En pause du au manque de participant

		const dailyScheduledMessage = new cron.CronJob('0 11 * * *', () => {
			smashOrPass();
		});

		dailyScheduledMessage.start();

		logger.info(`Status : ${client.user.tag} is started`);
	});

	/**
	 * Fonction qui gère le concours
	 * @returns
	 */
	async function concours() {

		const channel = client.channels.cache.get(ids.channels.concours);

		const saturdayScheduledMessage = new cron.CronJob('0 10 * * 6', () => {
			channel.send('<@&' + ids.roles.contestAllowed + '>');
			const mondayEmbed = new EmbedBuilder()
				.setColor('#EBBC4E')
				.setTitle('❗ Dernier jour pour poster ❗')
				.addFields({
					name: '🕰️ 24h pour participer 🕰️',
					value: 'Il vous reste un peu moins de 24h pour poster vos images et tenter de gagner le concours de la semaine !',
				})
				.setImage('https://i.imgur.com/3fUmg6N.png')
				.setFooter({
					text: 'Lewd Paradise au service de tout les hornys',
					iconURL: 'https://i.imgur.com/PQtvZLa.gif',
				});
			channel.send({ embeds: [mondayEmbed] });
		});

		const mondayScheduledMessage = new cron.CronJob('0 10 * * 1', () => {
			// channel.send('<@&' + ids.roles.contestAllowed + '>');
			let maxReactCount = 0;
			let winner = 0;
			async function run() {

				// Get all tags from the database
				const allTags = await Concours.findAll();

				// Find the max react count among all tags
				maxReactCount = Math.max(...allTags.map(tag => tag.count));

				winner = await Concours.findOne({ where: { count: maxReactCount } });

				logger.debug(winner.messageID);

				const mondayEmbed = new EmbedBuilder()
					.setTitle('🎉 Annonce du nom du gagnant 🎉')
					.addFields({
						name: '🏆 Qui est le gagnant 🏆',
						value: 'La personne ayant le plus de votes est: \n **<@' + winner.messageAuthorId + '>** ! \n\nFélicitations à lui ! Il gagne avec '
							+ maxReactCount + ' votes et obtient le rôle <@&' + ids.roles.contestWinner + '> !',
					})
					.setImage('https://i.imgur.com/3fUmg6N.png')
					.setColor('#EBBC4E')
					.setFooter({
						text: 'Lewd Paradise au service de tout les hornys',
						iconURL: 'https://i.imgur.com/PQtvZLa.gif',
					});

				channel.send({ embeds: [mondayEmbed] });

				Concours.sync({ Force: true });
			}
			run();
		});

		const sundayScheduledMessage = new cron.CronJob('0 10 * * 0', () => {
			channel.send('<@&' + ids.roles.contestAllowed + '>');
			const sundayEmbed = new EmbedBuilder()
				.setTitle('🌟 Fin des publications 🌟')
				.setDescription('La phase de publication est terminé !')
				.addFields(
					{
						name: '🗳️ Phase de votes : Choisissez vos préférés ! 🗳️',
						value: '- L\'émoji de vote et le suivant : <:' + ids.emojis.vote + '>\n- Aucune limite de vote est appliqué (nombre de vote infini)\n- Toute image dépassant 15 votes sera affichés dans <#' + ids.channels.bestOfArts + '>',
						inline: false,
					},
					{
						name: '🏆 Pour le vainquer 🏆',
						value: '- Le vainqueur est désigné directement par le bot\n- Le gagnant sera récompensé par le rôle <@&' + ids.roles.contestWinner + '>',
						inline: false,
					},
				)
				.setImage('https://i.imgur.com/3fUmg6N.png')
				.setColor('#EBBC4E')
				.setFooter({
					text: 'Lewd Paradise au service de tout les hornys',
					iconURL: 'https://i.imgur.com/PQtvZLa.gif',
				})
				.setTimestamp();
			channel.send({ embeds: [sundayEmbed] });
		});

		// When you want to start it, use:
		mondayScheduledMessage.start();
		saturdayScheduledMessage.start();
		sundayScheduledMessage.start();

	}

	async function smashOrPass() {
		// IDs des catégories à scanner
		const categoryIds = ids.categories.smashOrPass;

		// Liste pour stocker les salons des catégories spécifiées
		const eligibleChannels = [];

		// Parcourt toutes les guilds accessibles au bot
		client.guilds.cache.forEach(guild => {
			// Filtre les salons appartenant aux catégories spécifiées
			const channels = guild.channels.cache.filter(channel =>
				channel.isTextBased() &&
				channel.parentId &&
				categoryIds.includes(channel.parentId),
			);

			eligibleChannels.push(...channels.values());
		});

		if (eligibleChannels.length === 0) {
			logger.error('Aucun salon éligible trouvé dans les catégories spécifiées.');
			return;
		}

		// Sélectionne un salon aléatoire
		const randomChannel = eligibleChannels[Math.floor(Math.random() * eligibleChannels.length)];
		logger.debug(`Salon sélectionné : ${randomChannel.name} (ID: ${randomChannel.id})`);

		// Récupère les messages du salon sélectionné
		try {
			const messages = await randomChannel.messages.fetch({ limit: 100 });
			const images = [];

			messages.forEach(message => {
				if (message.attachments.size > 0) { // Vérifie si le message a des fichiers attachés
					message.attachments.forEach(attachment => {
						if (attachment.contentType && attachment.contentType.startsWith('image/')) {
							images.push({
								url: attachment.url,
								name: attachment.name,
								messageUrl: message.url,
								authorTag: message.author.tag,
								authorId: message.author.id,
							});
						}
					});
				}
			});

			if (images.length === 0) {
				logger.error(`Aucune image trouvée dans le salon ${randomChannel.name}.`);
				return;
			}

			// Sélectionne une image au hasard
			const randomImage = images[Math.floor(Math.random() * images.length)];
			logger.debug(`Image sélectionnée : ${randomImage.url}`);

			// Poste l'image dans un autre salon (par exemple, un salon spécifique)
			const targetChannelId = ids.channels.smashOrPassTarget; // ID du salon cible
			const targetChannel = client.channels.cache.get(targetChannelId);

			if (targetChannel && targetChannel.isTextBased()) {
				await targetChannel.send('Nouveau poste ! <@&' + ids.roles.smashOrPassPing + '>');
				const embed = new EmbedBuilder()
					.setTitle('✅ Smash or Pass ? ❌')
					.setDescription(`- Image postée par : **<@${randomImage.authorId}>** \n- Salon d'origine : ${randomImage.messageUrl}`)
					.setImage(randomImage.url)
					.setColor('#EBBC4E')
					.setFooter({
						text: 'Lewd Paradise au service de tout les hornys',
						iconURL: 'https://i.imgur.com/PQtvZLa.gif',
					});

				const message = await targetChannel.send({ embeds: [embed] });
				await message.react(ids.emojis.foxxoWow);
				await message.react(ids.emojis.foxxoHmph);
				logger.debug('Image postée avec succès !');
			} else {
				logger.error('Le salon cible est introuvable ou non textuel.');
			}
		} catch (error) {
			logger.error(`Erreur lors de la récupération des messages du salon ${randomChannel.id}:`, error);
		}
	}
};