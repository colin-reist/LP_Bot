const { Events, ActivityType, EmbedBuilder } = require('discord.js');
const cron = require('cron');
const logger = require('../../logger.js');
const { getChannelId } = require('../../utils/channelConfig.js');
const { runSmashOrPass } = require('../../handlers/smashOrPass.js');
const { restoreBumpReminder } = require('../../handlers/bumpReminder.js');

/** Statuts affichés à tour de rôle */
const STATUSES = [
	{ type: ActivityType.Playing, name: 'Compte le nombre de votes' },
	{ type: ActivityType.Watching, name: 'qui est qualifié' },
	{ type: ActivityType.Playing, name: '.gg/lewd.paradise' },
];

function sendStartLog(client) {
	const channel = client.channels.cache.get(getChannelId('logs'));
	if (!channel?.isTextBased()) {
		logger.error('Impossible d\'envoyer le message de démarrage du bot');
		return;
	}

	const startEmbed = new EmbedBuilder()
		.setColor('#00FF00')
		.setTitle('✅ Bot started ✅')
		.setDescription('The bot has been started successfully !')
		.setImage('https://i.imgur.com/3fUmg6N.png')
		.setFooter({
			text: 'Lewd Paradise au service de tout les hornys',
			iconURL: 'https://i.imgur.com/PQtvZLa.gif',
		});

	channel.send({ embeds: [startEmbed] })
		.catch(error => logger.error('Impossible d\'envoyer le message de démarrage du bot :', error));
}

module.exports = (client) => {
	client.once(Events.ClientReady, async () => {
		sendStartLog(client);

		// Statut aléatoire toutes les 10 minutes
		setInterval(() => {
			const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
			client.user.setActivity(status.name, { type: status.type });
		}, 600000);

		// Smash or Pass tous les jours à 11h
		new cron.CronJob('0 11 * * *', () => {
			runSmashOrPass(client).catch(error => logger.error('Smash or Pass quotidien :', error));
		}).start();

		// Reprend un éventuel rappel de bump en attente avant le redémarrage
		await restoreBumpReminder(client);

		logger.info(`Status : ${client.user.tag} is started`);
	});
};
