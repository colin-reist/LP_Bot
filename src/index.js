/* eslint-disable no-inline-comments */
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { token, logLevel } = require('../config/MainConfig.json');
const logger = require('./logger.js');
const { exec } = require('child_process');

logger.level = logLevel || 'info';

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

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

logger.debug('-- loading events --');

// Récupère et lance les événements
const eventFolderPath = path.join(__dirname, 'events/.');
const eventFolders = fs.readdirSync(eventFolderPath);
for (const folder of eventFolders) {
	const eventsPath = path.join(eventFolderPath, folder);
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
	for (const file of eventFiles) {
		logger.debug(`${folder.charAt(0).toUpperCase() + folder.slice(1)}${file.slice(0, -3)}`);
		try {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			event(client);
		} catch (error) {
			return logger.error(`Error loading event: ${file} \n${error}`);
		}
	}
}

logger.debug('-- loading commands --');

// Récupère les commandes
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
		}
		else {
			logger.error(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.login(token);
