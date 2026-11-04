const { EmbedBuilder } = require('discord.js');
const logger = require('../logger.js');
const ids = require('../../config/ids.json');
const { getChannelId } = require('../utils/channelConfig.js');
const { getSetting } = require('../utils/imageSpamSettings.js');

/**
 * Surveillance des salons de discussion : si plus de `threshold` images sont envoyées
 * à la suite sans aucun message texte entre elles (et sans pause de plus de `windowMin`),
 * le bot rappelle que c'est un salon de discussion et non un salon d'images.
 *
 * Salons et réglages : /antispam. Salon de redirection : /config → « Salon images ».
 * Appelé depuis src/events/message/create.js (un seul listener MessageCreate).
 */

/** @type {Map<string, { count: number, lastImageAt: number, lastAnnounce: number }>} état par salon */
const channelStates = new Map();

function getState(channelId) {
	let state = channelStates.get(channelId);
	if (!state) {
		state = { count: 0, lastImageAt: 0, lastAnnounce: 0 };
		channelStates.set(channelId, state);
	}
	return state;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;
// Hébergeurs d'images collées en lien
const IMAGE_HOSTS = /(^|\.)imgur\.com$/i;
// GIFs volontairement ignorés (sélecteur de GIFs Discord, liens collés) :
// ils ne comptent pas comme image et ne cassent pas la série non plus
const IGNORED_GIF_HOSTS = /(^|\.)(tenor\.com|giphy\.com|klipy\.com)$/i;
const URL_REGEX = /https?:\/\/\S+/gi;
// Emojis Unicode (avec modificateurs, drapeaux, ZWJ) et emojis custom <:nom:id> / <a:nom:id>
const EMOJI_REGEX = /<a?:\w+:\d+>|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200d|\ufe0f|\u20e3/gu;

/** @returns {URL|null} */
function parseUrl(raw) {
	try {
		return new URL(raw);
	} catch {
		return null;
	}
}

function isIgnoredGifUrl(raw) {
	const url = parseUrl(raw);
	return !!url && IGNORED_GIF_HOSTS.test(url.hostname);
}

function isImageUrl(raw) {
	const url = parseUrl(raw);
	if (!url || IGNORED_GIF_HOSTS.test(url.hostname)) return false;
	return IMAGE_EXT.test(url.pathname) || IMAGE_HOSTS.test(url.hostname);
}

/**
 * Analyse un message (ou un message transféré).
 * Les images collées en lien arrivent souvent SANS embed au moment du MessageCreate
 * (Discord l'ajoute ensuite via un MessageUpdate) : on regarde donc aussi les URLs du texte.
 * Un message qui ne contient que des liens d'images / GIFs n'est pas du texte.
 * @returns {{ images: number, hasText: boolean }}
 */
function analyse({ attachments, embeds, content }) {
	const attachmentImages = attachments.filter(a =>
		a.contentType?.startsWith('image/') || IMAGE_EXT.test(a.name ?? ''),
	).size;
	const embedImages = embeds.filter(e =>
		(e.data?.type === 'image' || e.data?.type === 'gifv') && !isIgnoredGifUrl(e.data?.url ?? ''),
	).length;

	const urls = content.match(URL_REGEX) ?? [];
	const urlImages = urls.filter(isImageUrl).length;
	const textOnly = urls
		.filter(u => isImageUrl(u) || isIgnoredGifUrl(u))
		.reduce((txt, u) => txt.replace(u, ''), content);

	return {
		// Embed et URL décrivent la même image : on garde le plus grand des deux
		images: attachmentImages + Math.max(embedImages, urlImages),
		// Un message composé uniquement d'emojis n'est pas de la discussion
		hasText: textOnly.replace(EMOJI_REGEX, '').trim().length > 0,
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

/** Staff (et boosters si activé) : leurs images ne comptent pas */
function isExempt(member) {
	if (!member) return false;
	if (member.roles.cache.some(role => role.name === ids.roles.staff)) return true;
	return getSetting('exemptBoosters') && member.roles.cache.has(ids.roles.boost);
}

function buildReminder() {
	const redirectId = getChannelId('imageRedirect');
	const description = getSetting('message')
		.replaceAll('{salon}', redirectId ? `<#${redirectId}>` : 'les salons prévus pour ça');

	return new EmbedBuilder()
		.setColor('#9013fe')
		.setTitle('💬 Petit rappel')
		.setDescription(description);
}

/**
 * @param {import('discord.js').Message} message
 */
async function imageSpamWatch(message) {
	try {
		if (!message.guild) return;
		if (!getSetting('channels').includes(message.channelId)) return;

		const state = getState(message.channelId);
		const { images, hasText } = countImages(message);

		if (images === 0) {
			// Un vrai message texte casse la série (staff compris : c'est de la discussion)
			if (hasText) state.count = 0;
			return;
		}
		if (isExempt(message.member)) return;

		const now = Date.now();
		// Trop longtemps depuis la dernière image : ce n'est plus une rafale
		if (now - state.lastImageAt > getSetting('windowMin') * 60 * 1000) state.count = 0;
		state.lastImageAt = now;

		state.count += images;
		logger.debug(`Anti-spam d'images : ${state.count} image(s) d'affilée dans #${message.channel.name}`);
		if (state.count <= getSetting('threshold')) return;

		state.count = 0;
		if (now - state.lastAnnounce < getSetting('cooldownSec') * 1000) return;
		state.lastAnnounce = now;

		const reminder = await message.channel.send({ embeds: [buildReminder()] });
		logger.debug(`Annonce anti-spam d'images envoyée dans #${message.channel.name}`);

		const deleteAfter = getSetting('deleteAfterSec');
		if (deleteAfter > 0) {
			setTimeout(() => reminder.delete().catch(() => null), deleteAfter * 1000).unref?.();
		}
	} catch (error) {
		logger.error('Erreur dans la surveillance anti-spam d\'images :', error);
	}
}

module.exports = { imageSpamWatch, buildReminder };
