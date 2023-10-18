const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resetname')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Rename all members of the server'),
async execute(interaction) {
    await interaction.reply({ content : 'Réinitialisation des noms des membres du serveur...', ephemeral: true});
    try {
        const guild = interaction.guild;
        const members = await guild.members.fetch();

        members.forEach(async (member) => {
            if (member.permissions.has('Administrator')) return console.log('Member is an admin, skipping...'); // skip admins
            member.setNickname(''); // set new name
        });
    } catch (error) {
        console.error(error);
    }
    await interaction.editReply({ content : 'Tout les noms des membres du serveur on été réinitialiser', ephemeral: true});
}
};