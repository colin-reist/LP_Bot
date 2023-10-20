/* eslint-disable no-inline-comments */
const fs = require('node:fs');
const Sequelize = require('sequelize');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
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

client.once(Events.ClientReady, () => {
	Tags.sync({ force: true }); // force: true will drop the table if it already exists
	client.user.setActivity({
		name: 'les méchants pas beaux',
		type: ActivityType.Watching,
	});
	console.log('Le bot à démarré sans erreur');
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

	try {
		const messageID = reaction.message.id;
		const messageURL = reaction.message.url;
		const reactionCount = reaction.count;


		const existingTag = await Tags.findOne({ where: { messageID: messageID } });
		if (existingTag === null) {
			console.log('---------Création du tag---------\n' + 'messageID: ' + messageID + ' \n'	+ 'messageURL: ' + messageURL + ' \n' + 'reactCount: ' + reactionCount + ' \n----------------------------------');
			// If a tag doesn't already exist, create one
			// eslint-disable-next-line no-unused-vars
			const tag = await Tags.create({
				messageID: messageID,
				messageURL: messageURL,
				reactCount: reactionCount,
			});
		} else {
			console.log('Le tag existe \nmessageID: ' + messageID + ' \nmessageURL: ' + messageURL + ' \nreactCount: ' + reactionCount + ' \n----------------------------------');
			// If a tag already exists, increment the reactCount property
			existingTag.reactCount = reactionCount;
		}
	} catch (error) {
		console.error('Une erreur est survenue lors d\'un rajout d\'émoji: ', error);
	}

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

	try {
		const messageID = reaction.message.id;
		const reactionCount = reaction.count;

		// Check if a tag already exists for this message
		const existingTag = await Tags.findOne({ where: { messageID: messageID } });
		existingTag.reactCount = reactionCount;
		console.log('MessageID: ' + messageID + ' à perdu un vote \nReactCount: ' + reactionCount);
	} catch (error) {
		console.error('Une erreur est survenue lors d\'un retrait d\'émoji: ', error);
	}

});

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
				name: tagName,
				description: tagDescription,
				username: interaction.user.username,
			});

			return interaction.reply(`Tag ${tag.name} added.`);
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
		const tag = await Tags.findOne({ where: { name: tagName } });

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
		const tag = await Tags.findOne({ where: { name: tagName } });

		if (tag) {
			return interaction.reply(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
		}

		return interaction.reply(`Could not find tag: ${tagName}`);
	}
	else if (commandName === 'showtags') {
		// equivalent to: SELECT name FROM tags;
		console.log('showtags');
		const tagList = await Tags.findAll({ attributes: ['messageID'] });
		const tagString = tagList.map(t => t.name).join(', ') || 'No tags set.';

		return interaction.reply(`List of tags: ${tagString}`);
	}
	else if (commandName === 'deletetag') {
		console.log('deletetag');
		const tagName = interaction.options.getString('name');
		// equivalent to: DELETE from tags WHERE name = ?;
		const rowCount = await Tags.destroy({ where: { name: tagName } });

		if (!rowCount) return interaction.reply('That tag doesn\'t exist.');

		return interaction.reply('Tag deleted.');
<<<<<<< Updated upstream
=======
	}
	else if (commandName === 'resettag') {
		console.log('resettag');
		Tags.sync({ force: true });

		return interaction.reply('Tags reset.');
>>>>>>> Stashed changes
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