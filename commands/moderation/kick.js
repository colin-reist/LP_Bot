const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à kick').setRequired(true))
        .setDescription('Kick un utilisateur du serveur'),
    async execute(interaction) {
        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Test lp bot');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }
    
        await interaction.reply({ content: 'Kicking user...', ephemeral: true });
    
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id);
        await member.kick();
    
        await interaction.editReply({ content: 'User has been kicked', ephemeral: true });	
    },
};