const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('userping')
		.setDescription('Replies with Pong!')
		.addUserOption(option => option.setName('user').setDescription('The user to ping')),
	async execute(interaction) {
		const user = interaction.options.getUser('user');
		await interaction.reply('Pong! <@' + user.id + '>');
	},
};