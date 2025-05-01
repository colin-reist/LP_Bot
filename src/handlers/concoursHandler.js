const { Concours } = require('../../database/database.js');
const logger = require('../logger.js');

/**
 * Fonction qui gère le starboard
 * @param {*} reaction La réaction ajoutée ou retirée
 * @param {*} AddOrRemove Si la réaction a été ajoutée ou retirée
 * @returns
 */
async function starboard(reaction) {
	// Get the user who reacted
	const user = await reaction.users.fetch(reaction.userId);
	if (user.bot) return;

	// Check if the reaction is on a message in the right channel
	if (reaction.message.channel.id !== '1164700276310155264') return;

	checkReaction(reaction);
	return;
}

/**
 * Créer une nouvelle participation pour le concours
 */
async function createConcoursParticipation(reaction, user) {
	logger.debug('createConcoursParticipation');
	const concoursItem = await Concours.findOne({ where: { post_link: reaction.message.url } });
	if (concoursItem) return;

	const participation = await Concours.create({
		fk_userID: user.id,
		count : reaction.count,
		post_link: reaction.message.url,
	});
	return participation;
}

/**
 * Met à jour la participation
 */
async function updateParticipation(reaction, user) {
	const concoursItem = await Concours.findOne({ where: { messageID: reaction.message.id } });
	if (!concoursItem) return;
	const participation = await Concours.findOne({ where: { messageID: reaction.message.id, userID: user.id } });
	if (!participation) return;
	participation.reactCount = reaction.count;
	await participation.save();
	return participation;
}


/**
 * Vérifie si c'est la première réaction sur un message, si oui on crée une nouvelle participation, sinon on met à jour la participation existante
 */
async function checkReaction(reaction) {
	const user = await reaction.users.fetch(reaction.userId);
	if (!user) return logger.error('Users not found');

	if (reaction.count === 1) {
		createConcoursParticipation(reaction, user);
	} else {
		updateParticipation(reaction, user);
	}
}


module.exports = { starboard };