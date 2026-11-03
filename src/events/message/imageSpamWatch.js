const { Events, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
const { getChannelId } = require('../../utils/channelConfig.js');
const { wrapEventHandler } = require('../../utils/eventWrapper.js');

/**
 * Surveillance du salon de discussion : si plus de MAX_IMAGES_IN_A_ROW images sont
 * envoyées à la suite sans aucun message texte entre elles, le bot rappelle que
 * c'est un salon de discussion et non un salon d'images.
 *
 * Le salon surveillé se règle via /config → « Discussion (anti-spam d'images) ».
 * Tant qu'il n'est pas défini, la fonctionnalité est inactive.
 */
const CHANNEL_KEY = 'chatImageWatch';
// L'annonce part à la 5e image consécutive
const MAX_IMAGES_IN_A_ROW = 4;
// Pas plus d'une annonce toutes les 2 minutes
const ANNOUNCE_COOLDOWN = 2 * 60 * 1000;

/** @type {Map<string, { count: number, lastAnnounce: number }>} état par salon */
const channelStates = new Map();

function getState(channelId) {
	let state = channelStates.get(channelId);
	if (!state) {
		state = { count: 0, lastAnnounce: 0 };
		channelStates.set(channelId, state);
	}
	return state;
}

/**
 * Nombre d'images (et GIFs) dans un message : pièces jointes + images collées en lien.
 * @param {import('discord.js').Message} message
 */
function countImages(message) {
	const attachments = message.attachments.filter(a =>
		a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif)$/i.test(a.name ?? ''),
	).size;
	const embeds = message.embeds.filter(e => e.data?.type === 'image' || e.data?.type === 'gifv').length;
	return attachments + embeds;
}

/**
 * @param {import('discord.js').Message} message
 */
async function handleImageSpamWatch(message) {
	if (message.author.bot || !message.guild) return;

	const watchedId = getChannelId(CHANNEL_KEY);
	if (!watchedId || message.channelId !== watchedId) return;

	const state = getState(message.channelId);
	const images = countImages(message);

	if (images === 0) {
		// Un vrai message texte casse la série
		if (message.content.trim().length > 0) state.count = 0;
		return;
	}

	state.count += images;
	if (state.count <= MAX_IMAGES_IN_A_ROW) return;

	state.count = 0;
	const now = Date.now();
	if (now - state.lastAnnounce < ANNOUNCE_COOLDOWN) return;
	state.lastAnnounce = now;

	const embed = new EmbedBuilder()
		.setColor('#9013fe')
		.setTitle('💬 Petit rappel')
		.setDescription('Ce salon est un **salon de discussion**, pas un salon de spam d\'images.\nMerci de poster vos images dans les salons prévus pour ça !');

	await message.channel.send({ embeds: [embed] });
	logger.debug(`Annonce anti-spam d'images envoyée dans #${message.channel.name}`);
}

module.exports = (client) => {
	const wrappedHandler = wrapEventHandler(
		Events.MessageCreate,
		handleImageSpamWatch,
		{ logExecution: false, timeout: 10000 },
	);

	client.on(Events.MessageCreate, wrappedHandler);
};
