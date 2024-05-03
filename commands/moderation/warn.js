const { SlashCommandBuilder } = require('discord.js');
const { warns, staffMembers, badUsers: badUserModel } = require('../../database.js');

module.exports = {
    data : new SlashCommandBuilder()
        .setName('warn')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à warnir').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('La raison du warn').setRequired(true))
        .setDescription('Warn un utilisateur du serveur'),
    async execute(interaction) {
        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }
    
        await interaction.reply({ content: 'Warn en cours...', ephemeral: true });
    
        // Capture qui à lancé la commande de warn
        const staff = interaction.member.user;
        const staffId = staff.id;
        const staffName = staff.username;

        // Capture les informations du l'utilisateur warni
        const user = interaction.options.getUser('utilisateur');
        const member = await interaction.guild.members.fetch(user.id);

        const raison = interaction.options.getString('raison');

        console.log('User : ' + user.id);
        console.log('Raison : ' + raison);
        console.log('Staff : ' + staffId);

        // Check si le staff executant la commande est un staff
        const staffMember = await staffMembers.findOne({ where: { sm_user_id: staffId } });
        if (!staffMember) {
            return interaction.editReply({ content: 'Tu n\'es pas un staff', ephemeral: true });
        }

        // Check si l'utilisateur à warni est déjà warni
        // Si l'utilisateur n'a jamais été warni on le rajoute à la liste de badUsers
        const warnUser = await badUserModel.findOne({ where: { bu_id: user.id } });
        if (!warnUser) {
            try {
            await badUserModel.create({
                bu_id: user.id,
                bu_name: user.username,
            });
            } catch (SequelizeUniqueConstraintError) {
                console.log('Constrainte de clé unique violée sur la table badUser');
            }
        }

        // Capture la fk de l'utilisateur warni pour lier le warn à l'utilisateur
        const foundBadUser = await badUserModel.findOne({ where: { bu_id: user.id } });
        const fkBadUser = foundBadUser.pk_badUsers;

        // Capture la fk du staff executant la commande pour lier le warn au staff
        const staffMemberId = await staffMembers.findOne({ where: { sm_user_id: staffId } });
        const fkStaffMember = staffMemberId.pk_staffMembers;

        console.log('\n\n--------------- Rajout du warn dans la base de données --------------- \n');

        try {
            await warns.create({
                wa_date: new Date(),
                wa_fk_badUserId: fkBadUser,
                wa_fk_staffMemberId: fkStaffMember,
                wa_reason: raison,
            });

            // Envoie un message privé à l'utilisateur warni
            await member.send('## Tu as été warn sur Lewd Paradise pour la raison suivante : \n' + raison);
    
            await interaction.editReply({ content: '<@' + user + '> à été warn !', ephemeral: true });	
        } catch (error) {
            console.log('\nErreur lors de l\'ajout du warn dans la base de données : \n' + error);
            console.log('voici l\'insertion qui a échoué : \n');
            console.log('raison : ' + raison);
            console.log('date : ' + new Date());
            console.log('badUserId : ' + fkBadUser);
            console.log('staffMemberId : ' + fkStaffMember);

            await interaction.editReply({ content: 'Erreur lors de l\'ajout du warn dans la base de données', ephemeral: true });
        }
    }
}