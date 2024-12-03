const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { kicks, badUsers: badUserModel, staffMembers } = require('../../database.js');

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
        const userOption = interaction.options.getUser('utilisateur'); // Récupération de l'option utilisateur
        const raison = interaction.options.getString('raison');
        const staff = interaction.member.user;

        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole?.id)) {
            return interaction.reply({ content: 'Vous n\'avez pas les permissions pour utiliser cette commande.', ephemeral: true });
        }

        await interaction.reply({ content: 'Traitement du kick en cours...', ephemeral: true });

        try {
            // Gestion des cas où l'utilisateur est mentionné ou donné par ID
            let user;
            if (userOption) {
                user = userOption; // Option utilisateur directement
            } else {
                const userInput = interaction.options.getString('utilisateur'); // Si seulement un ID brut
                user = await interaction.client.users.fetch(userInput).catch(() => null);
            }

            if (!user) {
                return interaction.editReply({ content: 'Utilisateur introuvable.', ephemeral: true });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) {
                return interaction.editReply({ content: 'Cet utilisateur n\'est pas un membre du serveur.', ephemeral: true });
            }

            const staffMember = await staffMembers.findOne({ where: { sm_user_id: staff.id } });
            if (!staffMember) {
                return interaction.editReply({ content: 'Vous devez être staff pour utiliser cette commande.', ephemeral: true });
            }

            const isStaff = await staffMembers.findOne({ where: { sm_user_id: user.id } });
            if (isStaff) {
                return interaction.editReply({ content: 'Vous ne pouvez pas kicker un autre membre du staff.', ephemeral: true });
            }

            const [badUser] = await badUserModel.findOrCreate({
                where: { bu_id: user.id },
                defaults: { bu_id: user.id, bu_name: user.username }
            });

            await kicks.create({
                ki_reason: raison,
                ki_date: new Date(),
                ki_fk_badUsers: badUser.pk_badUsers,
                ki_fk_staffMembers: staffMember.pk_staffMembers
            });

            const embedToUser = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Kick')
                .setDescription('Vous avez été kické du serveur')
                .addFields(
                    { name: 'Raison', value: raison },
                    { name: 'Staff', value: staff.username }
                )
                .setTimestamp()
                .setThumbnail(staff.displayAvatarURL());

            try {
                await member.send({ embeds: [embedToUser] });
            } catch (error) {
                console.error('Impossible d\'envoyer le message au membre :', error);
            }

            await member.kick(raison);
            await interaction.editReply({ content: `L'utilisateur <@${user.id}> a été kické pour la raison suivante : ${raison}` });

            const logChannel = interaction.guild.channels.cache.find(channel => channel.name === 'kick-log');
            if (logChannel) {
                const embedToLog = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Kick')
                    .setDescription('Un utilisateur a été kické')
                    .addFields(
                        { name: 'Utilisateur', value: user.username },
                        { name: 'Raison', value: raison },
                        { name: 'Staff', value: staff.username }
                    )
                    .setTimestamp()
                    .setThumbnail(user.displayAvatarURL());

                logChannel.send({ embeds: [embedToLog] });
            } else {
                console.warn('Le canal de log "kick-log" est introuvable.');
            }

        } catch (error) {
            console.error('Erreur lors du processus de kick :', error);
            interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.' });
        }
    }
};
