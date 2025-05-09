const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Users, Punishments } = require('../../../database/database.js');

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

        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole?.id)) {
            return interaction.reply({ content: 'Vous n\'avez pas les permissions pour utiliser cette commande.', ephemeral: true });
        }

        await interaction.reply({ content: 'Traitement du kick en cours...', ephemeral: true });

        try {
            let user = await Users.findOne({ where: { discord_identifier: kickedUser.id } });
            if (!user) {
                user = await Users.create({
                    discord_identifier: kickedUser.id,
                    username: kickedUser.username,
                });
            }

            let punisher = await Users.findOne({ where: { discord_identifier: staffMember.id } });
            if (!punisher) {
                punisher = await Users.create({
                    discord_identifier: staffMember.id,
                    username: staffMember.username,
                });
            }

            await Punishments.create({
                fk_user: user.pk_user,
                fk_punisher: punisher.pk_user,
                reason: reason,
                type: 'kick',
            });

            logKick(interaction, kickedUser, staffMember, reason);

            // Kick l'utilisateur
            try {
                await interaction.guild.members.kick(kickedUser.id, { reason: reason });
            } catch (error) {
                logger.error('Erreur lors du kick de l\'utilisateur :', error);
                return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', ephemeral: true });
            }

            return interaction.editReply({ content: `L'utilisateur <@${kickedUser.id}> a été kick pour la raison suivante : ${reason}` });

        } catch (error) {
            logger.error(error);
            return interaction.editReply({ content: 'Une erreur est survenue lors du kick de l\'utilisateur.', ephemeral: true });
        }
    }
};

async function logKick(interaction, kickedUser, staffMember, reason) {
	const warnEmbed = new EmbedBuilder()
			.setColor('#FF0000')
			.setTitle('Kick')
			.setDescription('Un utilisateur a été kick.')
			.addFields(
				{ name: 'Utilisateur', value: `<@${kickedUser.id}>`, inline: true },
				{ name: 'Raison', value: reason, inline: true },
				{ name: 'Staff', value: `<@${staffMember.id}>`, inline: true }
			)
			.setTimestamp()
			.setThumbnail(kickedUser.displayAvatarURL());

	// Public log
	try {
		const publicLogChannel = interaction.guild.channels.cache.get('1310662035436077198');
		const message = 'L\'utilisateur <@'+ kickedUser.id  + '> a été averti pour la raison suivante : ';
		await publicLogChannel.send(message);
		await publicLogChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log public :', error);
	}

	// Admin log§
	try{
		const adminLogWarnChannel = interaction.guild.channels.cache.get('1239286338256375898'); 
		await adminLogWarnChannel.send({ embeds: [warnEmbed] });
	} catch (error) {
		logger.error('Erreur lors du log admin :', error);
	}
}