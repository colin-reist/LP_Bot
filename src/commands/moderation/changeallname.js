/* eslint-disable no-inline-comments */
const { SlashCommandBuilder, PermissionFlagBits } = require('discord.js');
const logger = require('../../logger.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('renameall')
		.setDescription('Rename all members of the server')
		.setDefaultMemberPermissions(PermissionFlagBits.Administrator),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagBits.Administrator)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Administrateur`.',
				ephemeral: true
			});
		}

		await interaction.reply({ content: 'Renaming all members of the server...', ephemeral: true });
		try {
			logger.debug('-------Renaming all members of the server-------');
			const guild = interaction.guild;
			const members = await guild.members.fetch();

			members.forEach(async (member) => {
				if (member.permissions.has(PermissionFlagBits.Administrator)) return logger.debug(' -> ' + member.displayName + ' is an admin, skipping...'); // skip admins
				let newName = member.displayName; // get current name
				if (!newName.includes('!')) return; // remove everything after the first space
				newName = newName.replaceAll('!', ''); // remove exclamation marks
				newName = newName.replaceAll('?', ''); // remove question marks
				newName = newName.replaceAll('"', ''); // remove quotation marks
				newName = newName.trim(); // remove leading whitespace
				logger.debug(` -> Renamed ${member.displayName} to ${newName}`);
				setTimeout(async () => {
					await member.setNickname(newName); // set new name
				}, 1000); // wait 1 second between each rename
			});
			logger.debug('-------All members have been renamed!-------');

			await interaction.editReply({ content: 'All members have been renamed!', ephemeral: true });
		}
		catch (error) {
			logger.error(error);
		}
	},
};
