const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
const { Users, sequelize } = require('../../../database/database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Affiche le classement des membres par expérience'),
    async execute(interaction) {
        try {
            const users = await Users.findAll({
                order: [
                    ['experience', 'DESC']
                ],
                limit: 10
            });

            if (!users) {
                return await interaction.reply({ content: "❌ Aucun utilisateur n'est enregistré dans le système.", ephemeral: true });
            }

            // Création de l'embed
            const embed = new EmbedBuilder()
                .setColor('#3498db') // Bleu Discord
                .setTitle(`🔹 Classement des membres par expérience`)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true })) // Avatar du serveur
                .setFooter({ text: "Continuez à participer pour gagner plus d'XP !" })
                .setTimestamp();

            users.forEach((user, index) => {
                embed.addFields({ name: `🥇 #${index + 1} ${user.username}`, value: `**${user.experience}** points`, inline: false });
            });

            // Si l'utilisateur n'est pas dans le top 10
            const user = users.find(user => user.discord_identifier === interaction.user.id);
            if (!user) {
                const user = await Users.findOne({
                    where: sequelize.where(sequelize.cast(sequelize.col("discord_identifier"), "TEXT"), interaction.user.id)
                });

                if (user) {
                    embed.addFields({ name: `🔹 ${user.username}`, value: `**${user.experience}** points`, inline: false });
                }
            }

            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            logger.error('Erreur lors de la récupération du classement des membres :\n', error);
            await interaction.reply({ content: `⚠️ Erreur lors de l'exécution de la commande.\nMerci de prévenir le staff.`, ephemeral: true });
        }
    },
};
