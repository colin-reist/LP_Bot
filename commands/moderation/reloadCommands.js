const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)),
	async execute(interaction) {
		const commandName = interaction.options.getString('command', true);
		const command = interaction.client.commands.get(commandName.toLowerCase());

		// Trouver l'emplacement du ficher dans l'arboresence des fichiers
		const path = require('path');
		const fs = require('fs');
		const foldersPath = path.join(__dirname, 'commands');
		console.log('foldersPath : ' + foldersPath);
		
		


		if (!command) {
			return interaction.reply(`There is no command with name \`${commandName}\`!`);
		}

		try {
			delete require.cache[require.resolve(__dirname + "\\" + commandName + '.js')];
		} catch (error) {
			console.error(error);
			return interaction.reply({ content : `Erreur du delete \`${command.data.name}\`:\n\`${error.message}\``, ephemeral: true});
		}
		

		try {
	        interaction.client.commands.delete(command.data.name);
	        const newCommand = require(`../${command.category}/${command.data.name}.js`);
	        interaction.client.commands.set(newCommand.data.name, newCommand);
	        await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
		} catch (error) {
	        console.error(error);
	        await interaction.reply({ content : `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``, ephemeral: true});
		}
	},
};