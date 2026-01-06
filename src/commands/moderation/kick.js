const { SlashCommandBuilder } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists } = require('#utils/databaseUtils.js');
const { logModerationAction } = require('#utils/loggerUtils.js');
const { hasStaffRole } = require('#utils/permissionUtils.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick un utilisateur du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Mention ou ID de l\'utilisateur à kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du kick')
                .setRequired(true)),
    async execute(interaction) {
        const kickedUser = interaction.options.getUser('utilisateur'); // Récupération de l'option utilisateur
        const reason = interaction.options.getString('raison');
        const staffMember = interaction.member.user;

        await interaction.deferReply({ ephemeral: true });

        if (!hasStaffRole(interaction)) {
            return interaction.editReply({ content: 'Vous n\'avez pas les permissions pour utiliser cette commande.', ephemeral: true });
        }

        await interaction.editReply({ content: 'Traitement du kick en cours...', ephemeral: true });

        try {
            const user = await ensureUserExists(kickedUser.id, kickedUser.username);
            const punisher = await ensureUserExists(staffMember.id, staffMember.username);

            await Punishments.create({
                fk_user: user.pk_user,
                fk_punisher: punisher.pk_user,
                reason: reason,
                type: 'kick',
            });

            // Kick l'utilisateur
            try {
                await interaction.guild.members.kick(kickedUser.id, { reason: reason });
            } catch (error) {
                logger.error('Erreur lors du kick de l\'utilisateur :', error);
                return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', ephemeral: true });
            }

            await logModerationAction(interaction, kickedUser, staffMember, reason, 'Kick');
            return interaction.editReply({ content: `L'utilisateur <@${kickedUser.id}> a été kick pour la raison suivante : ${reason}` });

        } catch (error) {
            logger.error(error);
            return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', ephemeral: true });
        }
    }
};