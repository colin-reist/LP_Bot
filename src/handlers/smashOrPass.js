const { EmbedBuilder } = require('discord.js');
const logger = require('../logger.js');
const ids = require('../../config/ids.json');
const { getChannelId } = require('../utils/channelConfig.js');

/**
 * Smash or Pass : tire une image au hasard parmi les 100 derniers messages
 * d'un salon des catégories configurées et la republie dans le salon cible.
 * Utilisé par le cron quotidien (ready.js) et par /forcesmashorpass.
 *
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>} true si une image a été postée
 */
async function runSmashOrPass(client) {
	const categoryIds = ids.categories.smashOrPass;

	const eligibleChannels = [];
	client.guilds.cache.forEach(guild => {
		const channels = guild.channels.cache.filter(channel =>
			channel.isTextBased() &&
			channel.parentId &&
			categoryIds.includes(channel.parentId),
		);
		eligibleChannels.push(...channels.values());
	});

	if (eligibleChannels.length === 0) {
		logger.error('Smash or Pass : aucun salon éligible trouvé dans les catégories configurées.');
		return false;
	}

	const randomChannel = eligibleChannels[Math.floor(Math.random() * eligibleChannels.length)];
	logger.debug(`Smash or Pass : salon sélectionné ${randomChannel.name} (${randomChannel.id})`);

	try {
		// cache: false → les 100 messages ne restent pas en mémoire
		const messages = await randomChannel.messages.fetch({ limit: 100, cache: false });
		const images = [];

		for (const message of messages.values()) {
			for (const attachment of message.attachments.values()) {
				if (attachment.contentType?.startsWith('image/')) {
					images.push({
						url: attachment.url,
						messageUrl: message.url,
						authorId: message.author.id,
					});
				}
			}
		}

		if (images.length === 0) {
			logger.error(`Smash or Pass : aucune image trouvée dans ${randomChannel.name}.`);
			return false;
		}

		const randomImage = images[Math.floor(Math.random() * images.length)];
		const targetChannel = client.channels.cache.get(getChannelId('smashOrPassTarget'));

		if (!targetChannel?.isTextBased()) {
			logger.error('Smash or Pass : le salon cible est introuvable ou non textuel.');
			return false;
		}

		await targetChannel.send(`Nouveau poste ! <@&${ids.roles.smashOrPassPing}>`);
		const embed = new EmbedBuilder()
			.setTitle('✅ Smash or Pass ? ❌')
			.setDescription(`- Image postée par : **<@${randomImage.authorId}>** \n- Salon d'origine : ${randomImage.messageUrl}`)
			.setImage(randomImage.url)
			.setColor('#EBBC4E')
			.setFooter({
				text: 'Lewd Paradise au service de tout les hornys',
				iconURL: 'https://i.imgur.com/PQtvZLa.gif',
			});

		const posted = await targetChannel.send({ embeds: [embed] });
		await posted.react(ids.emojis.foxxoWow);
		await posted.react(ids.emojis.foxxoHmph);
		logger.debug('Smash or Pass : image postée.');
		return true;
	} catch (error) {
		logger.error(`Smash or Pass : erreur dans le salon ${randomChannel.id} :`, error);
		return false;
	}
}

module.exports = { runSmashOrPass };
