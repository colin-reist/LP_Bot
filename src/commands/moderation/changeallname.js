/* eslint-disable no-inline-comments */
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../logger.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('renameall')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Rename all members of the server'),
	async execute(interaction) {
		await interaction.reply({ content: 'Renaming all members of the server...', ephemeral: true });
		try {
			logger.info('-------Renaming all members of the server-------');
			const guild = interaction.guild;
			const members = await guild.members.fetch();

			members.forEach(async (member) => {
				if (member.permissions.has('Administrator')) return logger.info(' -> ' + member.displayName + ' is an admin, skipping...'); // skip admins
				let newName = member.displayName; // get current name
				if (!newName.includes('!')) return; // remove everything after the first space
				newName = newName.replaceAll('!', ''); // remove exclamation marks
				newName = newName.replaceAll('?', ''); // remove question marks
				newName = newName.replaceAll('"', ''); // remove quotation marks
				newName = newName.trim(); // remove leading whitespace
				logger.info(` -> Renamed ${member.displayName} to ${newName}`);
				setTimeout(async () => {
					await member.setNickname(newName); // set new name
				}, 1000); // wait 1 second between each rename
			});
			logger.info('-------All members have been renamed!-------');

			await interaction.editReply({ content: 'All members have been renamed!', ephemeral: true });
		}
		catch (error) {
			console.error(error);
		}
	},
};
