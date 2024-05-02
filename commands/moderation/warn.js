const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data : new SlashCommandBuilder()
        .setName('warn')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à warnir').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('La raison du warn').setRequired(false))
        .setDescription('Warn un utilisateur du serveur'),
    async execute(interaction) {
        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }
    
        await interaction.reply({ content: 'Warn en cours...', ephemeral: true });
    
        const user = interaction.options.getUser('utilisateur');
        const member = await interaction.guild.members.fetch(user.id);
        await member.send('**Tu as été warn sur Lewd Paradise pour la raison suivante :** \n' + interaction.options.getString('raison'));
    
        await interaction.editReply({ content: '<@' + user + '> à été warn !', ephemeral: true });	
    }
}