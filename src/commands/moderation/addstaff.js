const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { staffMembers } = require('../../../database/database.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('addstaff')
        .addUserOption(option => option.setName('utilisateur').setDescription('Le membre à rajouter à la liste de staff').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDescription('Rajouter un membre à la liste de staff'),
    async execute(interaction) {
        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }
    
        await interaction.reply({ content: 'Rajout du membre au staff...', ephemeral: true });
    
        // Rajoute le membre à la liste de staff
        const user = interaction.options.getUser('utilisateur');
        const userId = user.id;
        const userName = user.username;

        const staffMember = await staffMembers.findOne({ where: { sm_user_id: userId } });
        if (staffMember) {
            return interaction.editReply({ content: 'L\'utilisateur est déjà un staff', ephemeral: true });
        }

        await staffMembers.create({
            sm_user_id: userId,
            sm_staff_name: userName,
        });

    
        await interaction.editReply({ content: 'L\'utilisateur à été rajouté', ephemeral: true });	
    },
};