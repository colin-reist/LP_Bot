/* eslint-disable no-inline-comments */
const fs = require('node:fs');
const path = require('node:path');
const Sequelize = require('sequelize');
const { Client, Collection, Events, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, AuditLogEvent } = require('discord.js');
const { token } = require('./config.json');
const cron = require('cron');
const { Tags, Booster, suggestion, userLevels, sequelize  } = require('./database.js');

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
	Tags.sync(); // force: true will drop the table if it already exists
	Booster.sync();
	suggestion.sync();
	userLevels.sync();

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

	const channel = client.channels.cache.get('1052597479146790993');

	const saturdayScheduledMessage = new cron.CronJob('0 10 * * 6', () => {
		channel.send('<@&916476114254303262>>');
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
		channel.send('<@&916476114254303262>>');
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
		channel.send('<@&916476114254303262>>');
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
         if (await userLevels.findOne({ where: { userID: messageUserId } }) !== null) {
            await userLevels.increment('userXP', { by: 1, where: { userID: messageUserId } });
         } else {
            await userLevels.create({ userName: message.author.username, userID: messageUserId, userLevels: 0, userXP: 1 });
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
		const codeText = '\`/Bump\`';
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
	const guild = newMember.guild;
	const userId = newMember.user.id;

	if (!oldMember.roles.cache.has('965755928974618735') && newMember.roles.cache.has('965755928974618735')) {
		// User has boosted the server
		const userBoost = await Booster.findOne({ where: { userId } });

		if (userBoost) {
			// User has boosted the server more than once
			userBoost.boostCount++;
			userBoost.save();

			const embed = new EmbedBuilder()
				.setTitle('Un booster a augmenté son nombre de boost !')
				.setDescription(`Merci, ${newMember.user.tag}, pour booster le serveur ${userBoost.boostCount} fois ! Nous te sommes reconnaissants pour tes nombreux boosts.`)
				.setColor('#EBBC4E');

			const channel = guild.channels.cache.get('1061643658723590164');

			if (channel) {
				channel.send({ embeds: [embed] });
			}
		} else {
			// User is boosting the server for the first time
			await Booster.create({ userId, boostCount: 1 });

			const embed = new EmbedBuilder()
				.setTitle('Nouveau Booster!')
				.setDescription(`Bienvenue, ${newMember.user.tag}, merci d'avoir booster le serveur ! Nous apprécions ton soutien.`)
				.setColor('#EBBC4E');

			const channel = guild.channels.cache.get('1061643658723590164');

			if (channel) {
				channel.send({ embeds: [embed] });
			}
		}
	} else if (oldMember.roles.cache.has('965755928974618735') && !newMember.roles.cache.has('965755928974618735')) {
		// User has removed a boost
		const userBoost = await Booster.findOne({ where: { userId } });

		if (userBoost) {
			userBoost.boostCount--;

			if (userBoost.boostCount <= 0) {
			// If the user has no more boosts, delete the row from the database
				await userBoost.destroy();
			} else {
				userBoost.save();
			}
		}
	}
});


/**
	 * Capte le rajout d'une réaction sur un message
	 * @param {MessageReaction} reaction La réaction ajoutée
	 */
client.on(Events.MessageReactionAdd, async (reaction) => {
	// When a reaction is received, check if the structure is partial
	// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
	try {
		await reaction.fetch();
	}
	catch (error) {
		console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
	}
	checkReaction(reaction, 'add');
});

/**
	 * Capte le retrait d'une réaction sur un message
	 * @param {MessageReaction} reaction La réaction retirée
	 */
client.on(Events.MessageReactionRemove, async (reaction) => {
	// When a reaction is received, check if the structure is partial
	// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
	try {
		await reaction.fetch();
	}
	catch (error) {
		console.error('Something went wrong when fetching the message:', error);
		// Return as `reaction.message.author` may be undefined/null
	}

	checkReaction(reaction, 'remove');
});

async function checkReaction(reaction, addOrRemove) {
	if (reaction.message.channel.id === '1079499858064441344' || reaction.message.channel.id === '1153607344505245736') {
		starboard(reaction, addOrRemove);
	} else {
		console.log(' -> La réaction n\'est pas dans un channel de suggestion ou de starboard');
	}
}

/* async function suggestionManager(reaction, positive, negative) {
	console.log('------suggestion manager------');

	const existingSuggestion = await suggestion.findOne({ where: { suggestionId: reaction.message.id } });
	if (existingSuggestion === null) {
		console.log(' -> La suggestion n\'existe pas, id: ' + reaction.message.id);
		return;
	}

	existingSuggestion.suggestionCountTrue = positive;
	existingSuggestion.suggestionCountFalse = negative;
	existingSuggestion.save();

	if (existingSuggestion.suggestionImage === '') {
		try {
			const specialEmbed = new EmbedBuilder()
				.setColor('#ff0000')
				.addFields(
					{ name: 'Votes', value: '\n✅' + existingSuggestion.suggestionCountTrue + '\n❌' + existingSuggestion.suggestionCountFalse + '\n' },
					{ name: 'Suggestion', value: existingSuggestion.suggestionSuggestion },
				)
				.setTimestamp();
			await reaction.message.edit({ embeds: [specialEmbed] });
		} catch (error) {
			console.error(error);
		}
		return;
	} else {
		try {
			const specialEmbed = new EmbedBuilder()
				.setColor('#ff0000')
				.addFields(
					{ name: 'Votes', value: '\n✅' + existingSuggestion.suggestionCountTrue + '\n❌' + existingSuggestion.suggestionCountFalse + '\n' },
					{ name: 'Suggestion', value: existingSuggestion.suggestionSuggestion },
				)
				.setTimestamp()
				.setImage(existingSuggestion.suggestionImage);
			await reaction.message.edit({ embeds: [specialEmbed] });
		} catch (error) {
			console.error(error);
		}
		console.log(' -> Modification de l\'embed');
	}
	console.log('-------------------------------');
}*/

/**
 * Fonction qui gère le starboard
 * @param {*} reaction La réaction ajoutée ou retirée
 * @param {*} AddOrRemove Si la réaction a été ajoutée ou retirée
 * @returns
 */
async function starboard(reaction, AddOrRemove) {
	console.log('-------------starboard-------------');


	try {
		let existingTag = await Tags.findOne({ where: { linkedEmbed: reaction.message.id } });
		let messageAttachment = null; // initialize messageAttachment to null

		if (existingTag === null) {
			existingTag = await Tags.findOne({ where: { messageID: reaction.message.id } });
			if (existingTag === null) {
				console.log('-------Création du tag-------');


				// Check if the message has an image attachment
				if (reaction.message.attachments.size > 0) {
					const attachment = reaction.message.attachments.first();
					if (attachment.contentType.startsWith('image/')) {
						messageAttachment = attachment.url;
					}
				}
				// If a tag doesn't already exist, create one
				// eslint-disable-next-line no-unused-vars
				const tag = await Tags.create({
					messageID: reaction.message.id,
					messageAuthorName: reaction.message.author.username,
					messageAuthorId: reaction.message.author.id,
					messageAuthorAvatar: reaction.message.author.displayAvatarURL(),
					messageURL: reaction.message.url,
					reactCount: reaction.count,
					attachment: messageAttachment,
					posted: false,
					linkedEmbed: null,
				});
				return console.log(' Contenu du tag: \n' + 'MessageID: ' + tag.messageID + '\nMessageAuthorName: '
					+ tag.messageAuthorName + '\nMessageAuthorId: '	+ tag.messageAuthorId + '\nMessageAuthorAvatar: ' + tag.messageAuthorAvatar
					+ '\nMessageURL: ' + tag.messageURL + '\nReactCount: ' + tag.reactCount + '\nAttachment: '
					+ tag.attachment + '\nPosted: ' + tag.posted + '\nLinkedEmbed: ' + tag.linkedEmbed + '\n -> Tag créé \n---------------------------');

			} else {
				console.log(' -> Tag existant sans embed');
			}
		} else {
			console.log(' -> Tag existant avec embed');
		}

		(AddOrRemove === 'add') ? existingTag.reactCount++ : existingTag.reactCount--;
		existingTag.save();

		const realReactCount = existingTag.reactCount - 1 ; // On retire 1 au compteur de réaction pour éviter de compter le bot
		const starboardEmbed = new EmbedBuilder()
			.setColor('#EBBC4E')
			.setTitle('🌟 ' + realReactCount + ' | de ' + existingTag.messageURL)
			.setAuthor({ name: existingTag.messageAuthorName, iconURL: existingTag.messageAuthorAvatar, url: existingTag.messageURL })
			.setImage(existingTag.attachment)
			.setFooter({ text: 'Message ID: ' + existingTag.messageID });

		const starboardChannel = client.channels.cache.get('1153607344505245736'); // le channel du starboard
		// Si le message n'a pas encore été posté et qu'il a plus de 15 réactions, on poste un nouvel embed
		if (!existingTag.posted && existingTag.reactCount > 15) {
			console.log(' -> Création de l\'embed');
			existingTag.posted = true;
			existingTag.save();
			const message = await starboardChannel.send({ embeds: [starboardEmbed] });
			await message.react('🌟');
			const sendMessageID = message.id;
			existingTag.linkedEmbed = sendMessageID;
			existingTag.save();

			// Si le message a déjà été posté et qu'il a plus de 15 réactions, on modifie l'embed
		} else if (existingTag.posted && existingTag.reactCount > 14) {
			console.log(' -> Modification de l\'embed');
			const message = await starboardChannel.messages.fetch(existingTag.linkedEmbed);
			message.edit({ embeds: [starboardEmbed] });

			// Si le message a déjà été posté et qu'il a moins de 15 réactions, on supprime l'embed
		} else if (existingTag.posted && existingTag.reactCount < 15) {
			console.log(' -> Suppression de l\'embed');
			existingTag.posted = false;
			existingTag.save();
			const message = await starboardChannel.messages.fetch(existingTag.linkedEmbed);
			message.delete();

		}
	}
	catch (error) {
		console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
	}
	console.log('-----------------------------------');
}

/**
 * Capte les interactions
 * @param {Interaction} interaction L'interaction créée par l'utilisateur
 * @returns
 */
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const { cooldowns } = client;
	const command = client.commands.get(interaction.commandName);

	const { commandName } = interaction;

	if (commandName === 'addtag') {
		console.log('addtag');
		const tagName = interaction.options.getString('name');
		const tagDescription = interaction.options.getString('description');

		try {
			console.log('-------Création du tag-------');
			// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			const tag = await Tags.create({
				messageID: tagName,
				description: tagDescription,
				username: interaction.user.username,
			});
			console.log(' -> Tag créé \n' + ' Contenu du tag: \n' + 'MessageID: ' + tag.messageID + '\nMessageAuthorName: ');
			return interaction.reply(`Tag ${tag.messageID} added.`);
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				return interaction.reply('That tag already exists.');
			}

			return interaction.reply('Something went wrong with adding a tag.');
		}
	}
	else if (commandName === 'tag') {
		console.log('tag');
		const tagName = interaction.options.getString('name');

		// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
		const tag = await suggestion.findOne({ where: { suggestionId: tagName } });

		if (tag) {
			// equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
			tag.increment('usage_count');

			return interaction.reply(tag.get('description'));
		}

		return interaction.reply(`Could not find tag: ${tagName}`);
	}
	else if (commandName === 'edittag') {
		console.log('edittag');
		const tagName = interaction.options.getString('name');
		const tagDescription = interaction.options.getString('description');

		// equivalent to: UPDATE tags (description) values (?) WHERE name='?';
		const affectedRows = await Tags.update({ description: tagDescription }, { where: { name: tagName } });

		if (affectedRows > 0) {
			return interaction.reply(`Tag ${tagName} was edited.`);
		}

		return interaction.reply(`Could not find a tag with name ${tagName}.`);
	}
	else if (commandName == 'taginfo') {
		console.log('taginfo');
		const tagName = interaction.options.getString('name');

		// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
		const tag = await suggestion.findOne({ where: { suggestionId: tagName } });

		if (tag) {
			return interaction.reply(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
		}

		return interaction.reply(`Could not find tag: ${tagName}`);
	}
	else if (commandName === 'showtags') {
		// equivalent to: SELECT name FROM tags;
		console.log('showtags');
		const tagList = await suggestion.findAll({ attributes: ['suggestionId'] });
		const tagString = tagList.map(t => t.suggestionId).join(', ') || 'No tags set.';

		return interaction.reply(`List of tags: ${tagString}`);
	}
	else if (commandName === 'deletetag') {
		console.log('deletetag');
		const tagName = interaction.options.getString('name');
		// equivalent to: DELETE from tags WHERE name = ?;
		const rowCount = await Tags.destroy({ where: { messageID: tagName } });

		if (!rowCount) return interaction.reply('That tag doesn\'t exist.');

		return interaction.reply('Tag deleted.');
	}
	else if (commandName === 'resettag') {
		console.log('resettag');
		Tags.sync({ force: true });

		return interaction.reply('Tags reset.');
	} else if (commandName === 'suggérer') {
		const actualSuggestions = await suggestion.findOne({ where: { suggestionId: interaction.id } });
		console.log(actualSuggestions);
		if (actualSuggestions === null) {
			let messages = null;
			if (interaction.options.getAttachment('image') === null) {
				try {
					console.log('création de l\'embed sans image');
					const embed = new EmbedBuilder()
						.setColor('#EBBC4E')
						.setTitle('✨ Construction de votre suggestion ✨');

					const channelID = interaction.channel;
					messages = await channelID.send({ embeds: [embed] });
				} catch (error) {
					console.error(error);
				}
			} else {
				try {
					console.log('création de l\'embed avec image');
					const embed = new EmbedBuilder()
						.setColor('#EBBC4E')
						.setTitle('✨ Construction de votre suggestion ✨');
					const channelID = interaction.channel;
					messages = await channelID.send({ embeds: [embed] });
				} catch (error) {
					console.error(error);
				}
			}

			console.log('Rajout dans la table');
			const suggestionId = messages.id;
			const suggestionName = interaction.options.getString('nom');
			const suggestionSuggestion = interaction.options.getString('suggestion');
			const suggestionSuggerant = interaction.options.getUser('suggerant').id;
			const suggestionCount = 0;
			let existingImage = null;

			if (interaction.options.getAttachment('image') === null) {
				existingImage = '';
			} else {
				existingImage = interaction.options.getAttachment('image').url;
			}

			try {
				console.log('-------Création de la suggestion-------');
				// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
				const tag = await suggestion.create({
					suggestionId: suggestionId,
					suggestionName: suggestionName,
					suggestionSuggestion: suggestionSuggestion,
					suggestionSuggerant: suggestionSuggerant,
					suggestionCountTrue: suggestionCount,
					suggestionCountFalse: suggestionCount,
					suggestionImage: existingImage,
				});
				console.log('Contenu de la suggestion: \n' + 'suggestionId: ' + tag.suggestionId + '\nsuggestionName: '
				+ tag.suggestionName + '\nsuggestionDescription: ' + tag.suggestionSuggestion
				+ '\nsuggestionSuggerant: ' + tag.suggestionSuggerant + '\nsuggestionCount: ' + tag.suggestionCount + '\nexistingImage: '
				+ tag.suggestionImage + '\n---------------------------');
			} catch (error) {
				console.error(error);
			}
			await messages.react('✅');
			await messages.react('❌');
		}
	}

	if (!command) return;

	if (!cooldowns.has(command.data.name)) {
		cooldowns.set(command.data.name, new Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.data.name);
	const defaultCooldownDuration = 3;
	const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

	if (timestamps.has(interaction.user.id)) {
		const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

		if (now < expirationTime) {
			const expiredTimestamp = Math.round(expirationTime / 1000);
			return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
		}
	}

	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		}
		else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});
module.exports = { userLevels };
client.login(token);