const { Events, EmbedBuilder } = require('discord.js');
const { User } = require('../../../database/database.js');

/**
 * Capte l'envoi d'un message
 * @param {Message} message Le message envoyé
 * @returns
 */
module.exports = (client) => {
	client.on(Events.MessageCreate, async (message) => {
		if (message.author.bot) return;

		levelHandler(message);

		bumpHandler(message);
	});
};

function bumpHandler(message) {
	const bumbChannelId = '993935433228619886';
	const commandName = 'bump';
	console.log(message.channelId);
	console.log(message.interaction.channelId);
	console.log(bumbChannelId);

	if (!message.interaction || message.interaction.channelId !== bumbChannelId) return;

	console.log('Bump');

	if (message.interaction && message.interaction.commandName === commandName) {
		console.log('Bump command');
		const codeText = '\/Bump\'';
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
};

async function levelHandler(message) {
	let user = await User.findOne({ where: { discord_identifier: message.author.id } })
	if (user) {
		user.increment('experience', { by: 1, where: { discord_identifier: message.author.id } });
		if (message.member.roles.cache.some(role => role.name === 'Staff')) {
			user.update({ is_admin: true }, { where: { discord_identifier: message.author.id } });
		}
	} else {
		user = User.create({
			discord_identifier: message.author.id,
			username: message.author.username,
			experience: 1,
		});
	}
}