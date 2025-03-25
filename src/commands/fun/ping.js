const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		logger.debug('Ping command executed');
		await interaction.reply('Pong!');
	},
};