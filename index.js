/* eslint-disable no-inline-comments */
const fs = require('node:fs');
const Sequelize = require('sequelize');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, Partials, ActivityType, EmbedBuilder } = require('discord.js');
const { token } = require('./config.json');
const cron = require('cron');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const sequelize = new Sequelize('customer_594039_test', 'customer_594039_test', '~RYLVX6jqprbK#@JIZos', {
	host: 'eu02-sql.pebblehost.com',
	dialect: 'sqlite',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

const Tags = sequelize.define('tags', {
	messageID: {
		type: Sequelize.STRING,
		unique: true,
	},
	messageURL: Sequelize.TEXT,
	reactCount: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	posted: Sequelize.BOOLEAN,
	linkedEmbed: Sequelize.TEXT,
});

client.commands = new Collection();
client.cooldowns = new Collection(); // permet de faire fonctionner les cooldowns des commandes
const foldersPath = path.join(__dirname, 'commands/.');
const commandFolders = fs.readdirSync(foldersPath);


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

client.once(Events.ClientReady, () => {
	Tags.sync(); // force: true will drop the table if it already exists

	setInterval(() => {
		const index = Math.floor(Math.random() * (status.length - 1) + 1);
		client.user.setActivity(status[index].name, { type: status[index].type });
	}, 600000);

	/* const embed = new EmbedBuilder()
		.setColor('#0099ff')
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

	const channel = client.channels.cache.get('1047244666262802463');

	channel.send({ embeds: [embed] });*/

	const scheduledMessage = new cron.CronJob('0 20 * * 0', () => {
		// This runs every day at 10:30:00, you can do anything you want
		// Specifing your guild (server) and your channel

	});

	// When you want to start it, use:
	scheduledMessage.start();

	console.log(`Démarage de ${client.user.tag} à ${new Date().getHours()}h${new Date().getMinutes()}`);
});

// Send a message saying "hello" when the bot receives a message
client.on(Events.MessageCreate, async (message) => {

	if (message.interaction.commandName !== 'bump' || message.author.id === '932737762698874971') return;

	if (message.author.id === '302050872383242240' && message.channelId === '993935433228619886') {
		// eslint-disable-next-line no-useless-escape
		const codeText = '\`/Bump\`';


		message.channel.send('Merci d\'avoir bump le serveur <@' + message.interaction.user.id + '> !' + '\nNous vous rappelerons dans 2 heures de bump le serveur !');
		setTimeout(() => {
			const embed = new EmbedBuilder()
				.setColor('#ff0000')
				.setTitle('Il est temps de Bump !')
				.addFields({
					name: ' ',
					value: 'Utilisez la commande de ' + codeText + ' de <@302050872383242240>',
				})
				.setImage('https://images2.imgbox.com/05/c5/b2vOiqS4_o.gif');

			message.channel.send({ embeds: [embed] });
		}, 1200000);
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

	starboard(reaction);

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

	starboard(reaction);

});

async function starboard(reaction) {

	if (reaction.message.channel.id !== '1079499858064441344') return console.log('La réaction n\'est pas dans le bon channel');

	try {
		const messageID = reaction.message.id;
		const messageURL = reaction.message.url;
		const reactionCount = reaction.count;
		let messageAttachment = null; // initialize messageAttachment to null

		// Check if the message has an image attachment
		if (reaction.message.attachments.size > 0) {
			const attachment = reaction.message.attachments.first();
			if (attachment.contentType.startsWith('image/')) {
				messageAttachment = attachment.url;
			}
		}

		const existingTag = await Tags.findOne({ where: { messageID: messageID } });
		if (existingTag === null) {
			console.log('---------Création du tag---------');
			// If a tag doesn't already exist, create one
			// eslint-disable-next-line no-unused-vars
			const tag = await Tags.create({
				messageID: messageID,
				messageURL: messageURL,
				reactCount: reactionCount,
				posted: false,
				linkedEmbed: null,
			});
			return;
		} else {
			console.log('-------Le tag existe déjà-------');
			// If a tag already exists, increment the reactCount property
			existingTag.reactCount = reactionCount;
		}

		const starboardEmbed = new EmbedBuilder()
			.setColor('#0000FF')
			.setTitle('🌟 ' + reactionCount + ' | de <#' + reaction.message.channel + '>')
			.setAuthor({ name: reaction.message.author.username, iconURL: reaction.message.author.displayAvatarURL(), url: messageURL })
			.setImage(messageAttachment)
			.setFooter({ text: 'Message ID: ' + messageID });

		if (!existingTag.posted && reactionCount > 15) {
			existingTag.posted = true;
			existingTag.save();
			const message = await client.channels.cache.get('1153607344505245736').send({ embeds: [starboardEmbed] });
			const sendMessageID = message.id;
			existingTag.linkedEmbed = sendMessageID;
			existingTag.save();

		} else if (existingTag.posted && reactionCount > 14) {
			console.log('Modification de l\'embed');
			const message = await client.channels.cache.get('1153607344505245736').messages.fetch(existingTag.linkedEmbed);
			message.edit({ embeds: [starboardEmbed] });

		} else if (existingTag.posted && reactionCount < 15) {
			console.log('Suppression de l\'embed');
			existingTag.posted = false;
			existingTag.save();
			const message = await client.channels.cache.get('1153607344505245736').messages.fetch(existingTag.linkedEmbed);
			message.delete();

		}
	}
	catch (error) {
		console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
	}
}

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
			// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
			const tag = await Tags.create({
				messageID: tagName,
				description: tagDescription,
				username: interaction.user.username,
			});

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
		const tag = await Tags.findOne({ where: { messageID: tagName } });

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
		const tag = await Tags.findOne({ where: { messageID: tagName } });

		if (tag) {
			return interaction.reply(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
		}

		return interaction.reply(`Could not find tag: ${tagName}`);
	}
	else if (commandName === 'showtags') {
		// equivalent to: SELECT name FROM tags;
		console.log('showtags');
		const tagList = await Tags.findAll({ attributes: ['messageID'] });
		const tagString = tagList.map(t => t.messageID).join(', ') || 'No tags set.';

		return interaction.reply(`List of tags: ${tagString}`);
	}
	else if (commandName === 'deletetag') {
		console.log('deletetag');
		const tagName = interaction.options.getString('name');
		// equivalent to: DELETE from tags WHERE name = ?;
		const rowCount = await Tags.destroy({ where: { name: tagName } });

		if (!rowCount) return interaction.reply('That tag doesn\'t exist.');

		return interaction.reply('Tag deleted.');

	}
	else if (commandName === 'resettag') {
		console.log('resettag');
		Tags.sync({ force: true });

		return interaction.reply('Tags reset.');
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

client.login(token);