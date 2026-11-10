/* eslint-disable no-inline-comments */
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Options, Partials } = require('discord.js');
const logger = require('./logger.js');
const { exec } = require('child_process');
const { errorHandler } = require('./utils/errorHandler.js');
const { loadChannelConfig } = require('./utils/channelConfig.js');
const { loadImageSpamSettings } = require('./utils/imageSpamSettings.js');

// Validation des variables d'environnement critiques
const token = process.env.DISCORD_TOKEN;
if (!token) {
	logger.error('DISCORD_TOKEN manquant dans .env');
	process.exit(1);
}

// Le gestionnaire d'erreurs global est maintenant actif
logger.info('Error handler initialized');

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Message, Partials.Channel],
	// Limite la RAM : on ne garde que ce dont le bot a besoin.
	// GuildMemberManager reste illimité : GuildMemberUpdate (annonce boost / rôles)
	// et le compteur de /rolebutton (role.members) dépendent du cache membres complet.
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		MessageManager: 25,
		PresenceManager: 0,
		VoiceStateManager: 0,
		StageInstanceManager: 0,
		GuildStickerManager: 0,
		GuildScheduledEventManager: 0,
		GuildInviteManager: 0,
		AutoModerationRuleManager: 0,
	}),
	sweepers: {
		...Options.DefaultSweeperSettings,
		// Toutes les 15 min, vide les messages en cache de plus de 30 min
		messages: { interval: 900, lifetime: 1800 },
	},
});

// Les erreurs globales (uncaughtException / unhandledRejection) sont aussi postées dans le salon de logs
errorHandler.setClient(client);

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
		logger.debug(`Loading command: ${file}`);
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

// Charge les salons (/config) et les réglages anti-spam (/antispam) avant de se connecter
Promise.allSettled([loadChannelConfig(), loadImageSpamSettings()]).finally(() => client.login(token));

