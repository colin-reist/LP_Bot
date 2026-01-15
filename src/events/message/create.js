const { Events, EmbedBuilder } = require('discord.js');
const { Users } = require('../../../database/database.js');
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');

// Rate limiting pour le système XP
const userXpCooldowns = new Map();
const XP_COOLDOWN = 60000; // 1 minute en millisecondes

// Constantes pour le système XP
const XP_MIN = 9;
const XP_MAX = 16;
const XP_BOOST_MULTIPLIER = 1.2;

/**
 * Capte l'envoi d'un message
 * @param {Message} message Le message envoyé
 * @returns
 */
module.exports = (client) => {
	client.on(Events.MessageCreate, async (message) => {
		bumpHandler(message);

		if (message.author.bot) return;
		levelHandler(message);
		checkMandatoryRole(message);
	});
};

function bumpHandler(message) {
	const bumbChannelId = ids.channels.bump;
	const commandName = 'bump';

	if (!message.interaction && message.channelId !== bumbChannelId) return;

	// Check if interaction exists before accessing properties (Fix for potential crash)
	if (message.interaction && message.interaction.commandName === commandName) {
		logger.debug('Bump command');
		const codeText = '/Bump';
		message.channel.send('Merci d\'avoir bump le serveur <@' + message.interaction.user.id + '> !' + '\nNous vous rappelerons dans 2 heures de bump le serveur !');
		setTimeout(() => {
			message.channel.send('Il est temps de Bump ! <@&' + ids.roles.bumpPing + '> !');
			const embed = new EmbedBuilder()
				.setColor('#EBBC4E')
				.setTitle('Il est temps de Bump !')
				.addFields({
					name: ' ',
					value: 'Utilisez la commande de ' + codeText + ' de <@' + ids.users.bumpBot + '>',
				})
				.setImage('https://images2.imgbox.com/05/c5/b2vOiqS4_o.gif');

			message.channel.send({ embeds: [embed] });
		}, 7200000);
	}
}

async function checkMandatoryRole(message) {
	if (!message.guild) return;
	const user = message.member;
	const mandatoryRole = ids.roles.mandatory;

	for (const [key, roleId] of Object.entries(mandatoryRole)) {
		if (!user.roles.cache.has(roleId)) {
			const role = message.guild.roles.cache.get(roleId);
			if (role) {
				await user.roles.add(role);
				logger.debug(`Role ${role.name} added to ${user.user.tag}`);
			}
		}
	}

}

async function levelHandler(message) {
	try {
		if (message.author.bot) return;
		if (!message.guild) return;

		// Rate limiting par utilisateur
		const now = Date.now();
		const cooldownKey = message.author.id;

		if (userXpCooldowns.has(cooldownKey)) {
			const expirationTime = userXpCooldowns.get(cooldownKey) + XP_COOLDOWN;
			if (now < expirationTime) {
				// Utilisateur encore en cooldown, ne pas donner d'XP
				logger.debug(`User ${message.author.username} in XP cooldown`);
				return;
			}
		}

		// Mise à jour du cooldown
		userXpCooldowns.set(cooldownKey, now);

		// Nettoyage périodique du Map pour éviter les fuites mémoire
		// Si plus de 10 000 entrées, nettoyer les anciennes
		if (userXpCooldowns.size > 10000) {
			const oldestAllowed = now - XP_COOLDOWN;
			for (const [key, timestamp] of userXpCooldowns.entries()) {
				if (timestamp < oldestAllowed) {
					userXpCooldowns.delete(key);
				}
			}
			logger.debug(`XP cooldown cache cleaned: ${userXpCooldowns.size} entries remaining`);
		}

		const user = await Users.findOne({ where: { discord_identifier: message.author.id } });

		if (user) {
			const previousXP = user.experience;

			// Calcul de l'incrément XP avec les constantes
			let increment = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;

			const boost = message.member.roles.cache.some(role => role.id === ids.roles.boost);
			if (boost) {
				logger.debug(`Booster ${message.author.username}`);
				increment = Math.floor(increment * XP_BOOST_MULTIPLIER);
			}
			logger.debug(`Increment ${increment} XP for ${message.author.username}`);

			const newXP = previousXP + increment;
			const oldLevel = getLevelFromXP(previousXP);
			const newLevel = getLevelFromXP(newXP);

			await user.increment('experience', { by: increment });

			if (message.member && message.member.roles.cache.some(role => role.name === ids.roles.staff)) {
				await user.update({ is_admin: true });
			}

			if (newLevel > oldLevel) {
				logger.debug(`Nouveau niveau pour ${message.author.username} : ${newLevel}`);
				await handleLevelUp(message, newLevel);
				const channel = message.guild.channels.cache.get(ids.channels.levelUp);
				await channel.send(`🎉 Félicitations <@${message.author.id}> ! Tu as atteint le niveau ${newLevel} !`);
			}
		} else {
			await Users.create({
				discord_identifier: message.author.id,
				username: message.author.username,
				experience: 1,
			});
			logger.debug(`New user created: ${message.author.username}`);
		}
	} catch (error) {
		logger.error('Erreur lors de l\'incrémentation de l\'expérience :\n', error);
	}
}

function getLevelFromXP(xp) {
	let level = 0;
	while (true) {
		const requiredXP = 50 * level ** 2 + 50 * level + 100;
		if (xp < requiredXP) break;
		xp -= requiredXP;
		level++;
	}
	return level;
}

async function handleLevelUp(message, level) {
	const roleRewards = ids.roles.rewards;

	for (const [lvl, roleId] of Object.entries(roleRewards)) {
		if (level >= parseInt(lvl)) {
			const role = message.guild.roles.cache.find((r) => r.id === roleId);

			if (role && !message.member.roles.cache.has(role.id)) {
				await message.member.roles.add(role);
				logger.debug(`🎉 ${message.author.tag} a atteint le niveau ${level} → rôle ajouté : ${role.name}`);
			}
		}
	}
}
