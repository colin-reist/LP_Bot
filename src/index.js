/* eslint-disable no-inline-comments */
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const logger = require('./logger.js');
const { exec } = require('child_process');

// Validation des variables d'environnement critiques
const token = process.env.DISCORD_TOKEN;
if (!token) {
	logger.error('DISCORD_TOKEN manquant dans .env');
	process.exit(1);
}

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

logger.debug('-- loading events --');
const eventFolderPath = path.join(__dirname, 'events/.');
const eventFolders = fs.readdirSync(eventFolderPath);
for (const folder of eventFolders) {
	const eventsPath = path.join(eventFolderPath, folder);
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
	for (const file of eventFiles) {
		logger.debug(`Loading event: ${folder}/${file}`);
		try {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			event(client);
		} catch (error) {
			logger.error(`Error loading event: ${file} \n${error}`);
		}
	}
}

logger.debug('-- loading commands --');
client.commands = new Collection();
client.cooldowns = new Collection();
const foldersPath = path.join(__dirname, '../src/commands/.');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			logger.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

logger.debug('-- deploy commands --');
exec(`node ${path.join(__dirname, '../scripts/deploy-commands.js')}`, (error, stdout, stderr) => {
	if (error) {
		logger.error(`Erreur lors du déploiement des commandes: ${error.message}`);
		return;
	}
	if (stderr) {
		logger.error(`Erreur lors du déploiement des commandes: ${stderr}`);
		return;
	}
	logger.debug(`Déploiement des commandes réussi: ${stdout}`);
});

client.login(token);
