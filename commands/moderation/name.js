const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('renameall')
		.setDescription('Rename all members of the server'),
async execute(interaction) {
    await interaction.reply('Renaming all members of the server...');
    try {
        const guild = interaction.guild;
        const members = await guild.members.fetch();

        members.forEach(async (member) => {
            if (member.permissions.has('Administrator')) return console.log('Member is an admin, skipping...'); // skip admins
            var newName = member.displayName; // get current name
            newName = newName.replaceAll('!', ''); // remove exclamation marks
            newName = newName.trim(); // remove leading whitespace
            await member.setNickname(newName); // set new name
        });

        await interaction.followUp('All members have been renamed!');
    } catch (error) {
        console.error(error);
    }
    console.log('Finished renaming all members of the server.');
}
};
