const { EmbedBuilder } = require('discord.js');
const log = require('../logger.js').child({ module: 'imageSpam' });
const ids = require('../../config/ids.json');
const { getChannelId } = require('../utils/channelConfig.js');
const { getSetting } = require('../utils/imageSpamSettings.js');
const { logToDiscord } = require('../utils/discordLogger.js');

/**
 * Surveillance des salons de discussion : si plus de `threshold` images sont envoyées
 * à la suite sans aucun message texte entre elles (et sans pause de plus de `windowMin`),
 * le bot rappelle que c'est un salon de discussion et non un salon d'images.
 *
 * Salons et réglages : /antispam. Salon de redirection : /config → « Salon images ».
 * Appelé depuis src/events/message/create.js (un seul listener MessageCreate).
 */

/**
 * @typedef {{ count: number, lastImageAt: number, lastAnnounce: number, authors: Map<string, number> }} SpamState
 * `authors` : images postées par membre dans la série en cours (pour les logs)
 */
/** @type {Map<string, SpamState>} état par salon */
const channelStates = new Map();

function getState(channelId) {
	let state = channelStates.get(channelId);
	if (!state) {
		state = { count: 0, lastImageAt: 0, lastAnnounce: 0, authors: new Map() };
		channelStates.set(channelId, state);
	}
	return state;
}

/** Remet la série à zéro */
function resetSeries(state) {
	state.count = 0;
	state.authors.clear();
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
/**
 * Log console + Discord d'un déclenchement (rappel envoyé ou bloqué par le cooldown).
 * @param {import('discord.js').Message} message
 * @param {{ count: number, authors: Map<string, number> }} series
 * @param {{ sent: boolean, cooldownLeftSec?: number }} result
 */
function logTrigger(message, series, result) {
	const authors = [...series.authors.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([id, n]) => `<@${id}> (${n})`);
	const status = result.sent
		? `rappel envoyé${getSetting('deleteAfterSec') > 0 ? `, supprimé dans ${getSetting('deleteAfterSec')}s` : ''}`
		: `rappel NON envoyé (cooldown, encore ${result.cooldownLeftSec}s)`;

	log.info(`Déclenché dans #${message.channel.name} : ${series.count} images par ${series.authors.size} membre(s) → ${status}`);

	const embed = new EmbedBuilder()
		.setColor(result.sent ? '#9013fe' : '#808080')
		.setTitle(result.sent ? '🖼️ Anti-spam d\'images : rappel envoyé' : '🖼️ Anti-spam d\'images : déclenché (cooldown)')
		.addFields(
			{ name: 'Salon', value: `<#${message.channelId}>`, inline: true },
			{ name: 'Images d\'affilée', value: `${series.count} (seuil ${getSetting('threshold')})`, inline: true },
			{ name: 'Dernier message', value: `[Aller au message](${message.url})`, inline: true },
			{ name: 'Membres', value: authors.join(', ').slice(0, 1024) || '—' },
			{ name: 'Résultat', value: status },
		)
		.setTimestamp();

	// Volontairement non attendu : le log ne doit pas retarder le rappel
	logToDiscord(message.client, embed);
}

/**
 * @param {import('discord.js').Message} message
 */
async function imageSpamWatch(message) {
	try {
		if (!message.guild) return;
		// Salon non surveillé : silencieux (appelé pour chaque message du serveur)
		if (!getSetting('channels').includes(message.channelId)) return;

		const state = getState(message.channelId);
		const { images, hasText } = countImages(message);
		const where = `#${message.channel.name}`;

		if (images === 0) {
			// Un vrai message texte casse la série (staff compris : c'est de la discussion)
			if (hasText && state.count > 0) {
				log.debug(`${where} : série de ${state.count} image(s) cassée par un message texte de ${message.author.tag}`);
				resetSeries(state);
			}
			return;
		}
		if (isExempt(message.member)) {
			log.debug(`${where} : ${images} image(s) de ${message.author.tag} ignorée(s) (membre exempté)`);
			return;
		}

		const now = Date.now();
		// Trop longtemps depuis la dernière image : ce n'est plus une rafale
		if (state.count > 0 && now - state.lastImageAt > getSetting('windowMin') * 60 * 1000) {
			log.debug(`${where} : série de ${state.count} image(s) expirée (plus de ${getSetting('windowMin')} min sans image)`);
			resetSeries(state);
		}
		state.lastImageAt = now;

		state.count += images;
		state.authors.set(message.author.id, (state.authors.get(message.author.id) ?? 0) + images);
		log.debug(`${where} : ${state.count}/${getSetting('threshold')} image(s) d'affilée (+${images} de ${message.author.tag})`);
		if (state.count <= getSetting('threshold')) return;

		// Copie de la série avant remise à zéro, pour le log
		const series = { count: state.count, authors: new Map(state.authors) };
		resetSeries(state);

		const cooldownLeft = getSetting('cooldownSec') * 1000 - (now - state.lastAnnounce);
		if (cooldownLeft > 0) {
			logTrigger(message, series, { sent: false, cooldownLeftSec: Math.ceil(cooldownLeft / 1000) });
			return;
		}
		state.lastAnnounce = now;

		const reminder = await message.channel.send({ embeds: [buildReminder()] });
		logTrigger(message, series, { sent: true });

		const deleteAfter = getSetting('deleteAfterSec');
		if (deleteAfter > 0) {
			setTimeout(() => {
				reminder.delete()
					.then(() => log.debug(`${where} : rappel supprimé après ${deleteAfter}s`))
					.catch(error => log.warn(`${where} : impossible de supprimer le rappel :`, error.message));
			}, deleteAfter * 1000).unref?.();
		}
	} catch (error) {
		log.error('Erreur dans la surveillance anti-spam d\'images :', error);
	}
}

module.exports = { imageSpamWatch, buildReminder };
