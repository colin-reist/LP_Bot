const { Events, EmbedBuilder } = require('discord.js');
const { Users } = require('../../../database/database.js');
const logger = require('../../logger.js');

/**
 * Capte l'envoi d'un message
 * @param {Message} message Le message envoyé
 * @returns
 */
module.exports = (client) => {
	client.on(Events.MessageCreate, async (message) => {
		levelHandler(message);
		bumpHandler(message);
	});
};

function bumpHandler(message) {
	const bumbChannelId = '993935433228619886';
	const commandName = 'bump';

	if (!message.interaction) return;

	if (message.channelId !== bumbChannelId) return;

	if (message.interaction.commandName === commandName) {
		logger.debug('Bump command');
		const codeText = '/Bump';
		message.channel.send('Merci d\'avoir bump le serveur <@' + message.interaction.user.id + '> !' + '\nNous vous rappelerons dans 2 heures de bump le serveur !');
		setTimeout(() => {
			message.channel.send('Il est temps de Bump ! <@&1044348995901861908> !');
			const embed = new EmbedBuilder()
				.setColor('#EBBC4E')
				.setTitle('Il est temps de Bump !')
				.addFields({
					name: ' ',
					value: 'Utilisez la commande de ' + codeText + ' de <@302050872383242240>',
				})
				.setImage('https://images2.imgbox.com/05/c5/b2vOiqS4_o.gif');

			message.channel.send({ embeds: [embed] });
		}, 7200000);
	}
}

async function levelHandler(message) {
	try {
		if (message.author.bot) return;

		const user = await Users.findOne({ where: { discord_identifier: message.author.id } });

		if (user) {
			const previousXP = user.experience;
			let increment = Math.floor(Math.random() * 10) + 1;
			const boost = message.member.roles.cache.some(role => role.id === '965755928974618735');
			if (boost) {
				logger.debug(`Booster ${message.author.username}`);
				increment = Math.floor(increment * 1.2);
			}
			logger.debug(`Increment ${increment}`);

			const newXP = previousXP + increment;
			const oldLevel = getLevelFromXP(previousXP);
			const newLevel = getLevelFromXP(newXP);

			await user.increment('experience', { by: increment });

			if (message.member && message.member.roles.cache.some(role => role.name === 'Staff')) {
				await user.update({ is_admin: true });
			}

			if (newLevel > oldLevel) {
				logger.debug(`Nouveau niveau pour ${message.author.username} : ${newLevel}`);
				await handleLevelUp(message, newLevel);
				const channel = message.guild.channels.cache.get('940355174759821323');
				await channel.send(`🎉 Félicitations <@${message.author.id}> ! Tu as atteint le niveau ${newLevel} !`);
			}
		} else {
			await Users.create({
				discord_identifier: message.author.id,
				username: message.author.username,
				experience: 1,
			});
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
	const roleRewards = {
		5: '916487249695232000',
		10: '916489810821152788',
		20: '916489632592560188',
		40: '916489376555479041',
	};

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
