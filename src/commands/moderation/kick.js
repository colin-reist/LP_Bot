const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Punishments } = require('#database');
const logger = require('#logger');
const { ensureUserExists } = require('#utils/databaseUtils');
const { logModerationAction } = require('#utils/loggerUtils');
const { hasStaffRole } = require('#utils/permissionUtils');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick un utilisateur du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Mention ou ID de l\'utilisateur à kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du kick')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Double vérification des permissions (sécurité renforcée)
        if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.editReply({
                content: '❌ Vous n\'avez pas la permission `Expulser des membres`.',
                ephemeral: true
            });
        }

        // Vérification Staff (en plus de Discord permissions)
        if (!hasStaffRole(interaction)) {
            return interaction.editReply({
                content: '❌ Vous devez avoir le rôle Staff.',
                ephemeral: true
            });
        }

        const kickedUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison');
        const staffMember = interaction.member.user;

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