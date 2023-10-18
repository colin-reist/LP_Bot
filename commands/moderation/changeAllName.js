/* eslint-disable no-inline-comments */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('renameall')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Rename all members of the server'),
	async execute(interaction) {
		await interaction.reply({ content: 'Renaming all members of the server...', ephemeral: true });
		try {
			const guild = interaction.guild;
			const members = await guild.members.fetch();

			members.forEach(async (member) => {
				if (member.permissions.has('Administrator')) return console.log('Member is an admin, skipping...'); // skip admins
				let newName = member.displayName; // get current name
				newName = newName.replaceAll('!', ''); // remove exclamation marks
				newName = newName.trim(); // remove leading whitespace
				await member.setNickname(newName); // set new name
			});

			await interaction.followUp({ content: 'All members have been renamed!', ephemeral: true });
		}
		catch (error) {
			console.error(error);
		}
		console.log('Finished renaming all members of the server.');
	},
};
