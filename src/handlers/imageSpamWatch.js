const { EmbedBuilder } = require('discord.js');
const logger = require('../logger.js');
const { getChannelId } = require('../utils/channelConfig.js');

/**
 * Surveillance du salon de discussion : si plus de MAX_IMAGES_IN_A_ROW images sont
 * envoyées à la suite sans aucun message texte entre elles, le bot rappelle que
 * c'est un salon de discussion et non un salon d'images.
 *
 * Le salon surveillé se règle via /config → « Discussion (anti-spam d'images) ».
 * Tant qu'il n'est pas défini, la fonctionnalité est inactive.
 * Appelé depuis src/events/message/create.js (un seul listener MessageCreate).
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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;
// Hébergeurs de GIFs (sélecteur de GIFs Discord, liens collés)
const GIF_HOSTS = /(^|\.)(tenor\.com|giphy\.com|klipy\.com|imgur\.com)$/i;
const URL_REGEX = /https?:\/\/\S+/gi;

/** Une URL pointe-t-elle vers une image / un GIF ? */
function isImageUrl(raw) {
	try {
		const url = new URL(raw);
		return IMAGE_EXT.test(url.pathname) || GIF_HOSTS.test(url.hostname);
	} catch {
		return false;
	}
}

/**
 * Analyse un message (ou un message transféré).
 * Les GIFs et images collés en lien arrivent souvent SANS embed au moment du
 * MessageCreate (Discord l'ajoute ensuite via un MessageUpdate) : on regarde donc aussi
 * les URLs du texte. Un message qui ne contient que des liens d'images n'est pas du texte.
 * @returns {{ images: number, hasText: boolean }}
 */
function analyse({ attachments, embeds, content }) {
	const attachmentImages = attachments.filter(a =>
		a.contentType?.startsWith('image/') || IMAGE_EXT.test(a.name ?? ''),
	).size;
	const embedImages = embeds.filter(e => e.data?.type === 'image' || e.data?.type === 'gifv').length;

	const urls = content.match(URL_REGEX) ?? [];
	const urlImages = urls.filter(isImageUrl).length;
	const textWithoutImageUrls = urls.filter(isImageUrl).reduce((txt, u) => txt.replace(u, ''), content);

	return {
		// Embed et URL décrivent la même image : on garde le plus grand des deux
		images: attachmentImages + Math.max(embedImages, urlImages),
		hasText: textWithoutImageUrls.trim().length > 0,
	};
}

/**
 * @param {import('discord.js').Message} message
 * @returns {{ images: number, hasText: boolean }}
 */
function countImages(message) {
	const result = analyse(message);
	// Messages transférés : le contenu est dans les snapshots
	for (const snapshot of message.messageSnapshots?.values() ?? []) {
		const snap = analyse(snapshot);
		result.images += snap.images;
		result.hasText ||= snap.hasText;
	}
	return result;
}

/**
 * @param {import('discord.js').Message} message
 */
async function imageSpamWatch(message) {
	try {
		if (!message.guild) return;
		const watchedId = getChannelId(CHANNEL_KEY);
		if (!watchedId || message.channelId !== watchedId) return;

		const state = getState(message.channelId);
		const { images, hasText } = countImages(message);

		if (images === 0) {
			// Un vrai message texte casse la série
			if (hasText) state.count = 0;
			return;
		}

		state.count += images;
		logger.debug(`Anti-spam d'images : ${state.count} image(s) d'affilée dans #${message.channel.name}`);
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
	} catch (error) {
		logger.error('Erreur dans la surveillance anti-spam d\'images :', error);
	}
}

module.exports = { imageSpamWatch };
