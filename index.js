/* eslint-disable no-inline-comments */
const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');
const { Client, Collection, Events, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { token } = require('./MainConfig.json');
const cron = require('cron');
const { Tags, Booster, suggestion, userLevels } = require('./database.js');
const memberUpdate = require('./events/guildMemberUpdate.js');
const messageReactionAdd = require('./events/messageReactionAdd.js');
const interactionCreated = require('./events/interactionCreate.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection(); // permet de faire fonctionner les commandes
client.cooldowns = new Collection(); // permet de faire fonctionner les cooldowns des commandes
const foldersPath = path.join(__dirname, 'commands/.'); // le chemin des dossiers de commandes
const commandFolders = fs.readdirSync(foldersPath); // le dossier des commandes


for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

/**
 * Tableau des status du bot
 */
const status = [
	{
		type: ActivityType.Playing,
		name: 'Compte le nombre de votes',
	},
	{
		type: ActivityType.Watching,
		name: 'qui est qualifié',
	},
	{
		name: '.gg/lewd.paradise',
		type: ActivityType.Playing,
		url: 'https://discord.gg/lewd.paradise',
	},
];

/**
 * Capte le démarage du bot
 * @returns
 */
client.once(Events.ClientReady, () => {

	setInterval(() => {
		const index = Math.floor(Math.random() * (status.length - 1) + 1);
		client.user.setActivity(status[index].name, { type: status[index].type });
	}, 600000);

	concours();

	console.log(`Démarage de ${client.user.tag} à ${new Date().getHours()}h`);
});

/**
 * Fonction qui gère le concours
 * @returns
 */
async function concours() {

	const channel = client.channels.cache.get('1256360061098397746');

	const saturdayScheduledMessage = new cron.CronJob('0 10 * * 6', () => {
		channel.send('<@&1239680929958592524>');
		const mondayEmbed = new EmbedBuilder()
			.setColor('#EBBC4E')
			.setTitle('❗ Dernier jour pour poster ❗')
			.addFields({
				name: '🕰️ 24h pour participer 🕰️',
				value: 'Il vous reste un peu moins de 24h pour poster vos images et tenter de gagner le concours de la semaine !',
			})
			.setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')
			
			.setFooter({ text: 'Lewd Paradise au service de tout les horny' });
		channel.send({ embeds: [mondayEmbed] });
	});

	const mondayScheduledMessage = new cron.CronJob('0 10 * * 1', () => {
		channel.send('<@&1239680929958592524>');
		let maxReactCount = 0;
		let winner = 0;
		async function run() {

			// Get all tags from the database
			const allTags = await Tags.findAll();

			// Find the max react count among all tags
			maxReactCount = Math.max(...allTags.map(tag => tag.reactCount));

			winner = await Tags.findOne({ where: { reactCount: maxReactCount } });

			console.log(winner.messageID);

			const mondayEmbed = new EmbedBuilder()
				.setColor('#EBBC4E')
				.setTitle('🎉 Annonce du nom du gagnant 🎉')
				.addFields({
					name: '🏆 Qui est le gagnant 🏆',
					value: 'La personne ayant le plus de votes est: \n **<@' + winner.messageAuthorId + '>** ! \n\nFélicitations à lui ! Il gagne avec '
				+ maxReactCount + ' votes et obtient le rôle <@&1052591643544522782> !',
				})
				.setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')
				.setFooter({ text: 'Lewd Paradise au service de tout les horny' });

			channel.send({ embeds: [mondayEmbed] });

			Tags.sync({ Force: true });
		}
		run();
	});

	const sundayScheduledMessage = new cron.CronJob('0 10 * * 0', () => {
		channel.send('<@&1239680929958592524>');
		const sundayEmbed = new EmbedBuilder()
			.setColor('#EBBC4E')
			.setTitle('🌟 Fin des publications 🌟')
			.addFields({
				name: '🗳️ Phase de votes 🗳️',
				value: 'Vous pouvez maintenant voter pour vos images préférées ! \nles personnes ayant plus de 15 votes seront affiché dans: \n* <#1153607344505245736>'
				+ '\nPour voter, il vous suffit de réagir avec <:LP_vote:1001230627242250392> sur les images que vous aimez !'
				+ '\nVous pouvez voter pour autant d\'images que vous le souhaitez !',
			})
			.addFields({
				name: '🏆 Pour le vainquer 🏆',
				value: 'Le vainqueur sera auto désigné par le bot ! \nIl sera celui qui aura le plus de votes !'
				+ '\nLe gagnant recevra le rôle <@&1153607344505245736> et sera affiché dans: \n* <#1165043827430670416> !',
			})
			.setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')
			.setFooter({ text: 'Lewd Paradise au service de tout les horny' });

		channel.send({ embeds: [sundayEmbed] });
	});

	// When you want to start it, use:
	mondayScheduledMessage.start();
	saturdayScheduledMessage.start();
	sundayScheduledMessage.start();

}

async function levelManager(message) {
    if (message.author.bot) return;

    const messageUserId = message.author.id;

    try{
         if (await userLevels.findOne({ where: { ul_user_id: messageUserId } }) !== null) {
            await userLevels.increment('ul_xp', { by: 1, where: { ul_user_id: messageUserId } });
         } else {
            await userLevels.create({ ul_name: message.author.username, ul_user_id: messageUserId, ul_level: 0, ul_xp: 1 });
         }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Capte l'envoi d'un message
 * @param {Message} message Le message envoyé
 * @returns
 */
client.on(Events.MessageCreate, async (message) => {

	const bumbChannelId = '993935433228619886'; // le channel du bump
	const commandName = 'bump'; // la commande de bump
	const bumpBotID = '302050872383242240'; // l'id du bot de bump

	if (!message.author.bot) {
		levelManager(message)
	}


	// Si le message n'est pas dans le channel de bump ou c'est mon bot qui a envoyé le message ou le message n'est pas envoyé par le bot de bump
	if (message.channelId !== bumbChannelId || message.author.id !== bumpBotID) return ;

	// Si le message est envoyé par le bot de bump et que la commande est bump
	if (message.interaction.commandName === commandName) {
		// eslint-disable-next-line no-useless-escape
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
});

/**
 * Capte la modification des rôles d'un membre
 * @param {GuildMember} oldMember Le membre avant la modification
 * @param {GuildMember} newMember Le membre après la modification
 * @returns
 */
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
	if (!oldMember.roles.cache.has('965755928974618735') && newMember.roles.cache.has('965755928974618735')) {
		memberUpdate.boost(newMember);
	}
});

client.on(Events.MessageReactionAdd, async (reaction) => {
	try {
		await reaction.fetch();
	}
	catch (error) {
		console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
	}
	messageReactionAdd.checkReaction(reaction, 'add');
});

client.on(Events.MessageReactionRemove, async (reaction) => {
	try {
		await reaction.fetch();
	}
	catch (error) {
		console.error('Something went wrong when fetching the message:', error);
	}
	messageReactionAdd.checkReaction(reaction, 'remove');
});

/**
 * Capte les interactions
 * @param {Interaction} interaction L'interaction créée par l'utilisateur
 * @returns
 */
client.on(Events.InteractionCreate, async interaction => {
	interactionCreated.interactionCreate(interaction);
});

client.login(token);