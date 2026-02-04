const { EmbedBuilder } = require('discord.js');
const ids = require('#config/ids');
const logger = require('#logger');

/**
 * Logs a moderation action (Warn, Ban, Kick) to the configured log channels.
 * @param {Interaction} interaction The interaction context.
 * @param {User} targetUser The user being moderated.
 * @param {User} staffUser The staff member performing the action.
 * @param {string} reason The reason for the action.
 * @param {string} type The type of action ('Warn', 'Kick', 'Ban').
 * @param {string} [color='#FF0000'] The color of the embed.
 */
async function logModerationAction(interaction, targetUser, staffUser, reason, type, color = '#FF0000') {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(type)
        .setDescription(`Un utilisateur a été ${type.toLowerCase()}.`)
        .addFields(
            { name: 'Utilisateur', value: `<@${targetUser.id}>`, inline: true },
            { name: 'Raison', value: reason, inline: true },
            { name: 'Staff', value: `<@${staffUser.id}>`, inline: true }
        )
        .setTimestamp()
        .setThumbnail(targetUser.displayAvatarURL());

    const messageContent = `L'utilisateur <@${targetUser.id}> a été ${type.toLowerCase()} pour la raison suivante : `;

    // Helper to send to a channel safely
    const sendToChannel = async (channelId, logName) => {
        try {
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                logger.warn(`${logName} channel not found (ID: ${channelId})`);
                return;
            }
            // For public logs, we send a message + embed. For admin, just embed (based on previous code).
            if (logName === 'Public Log') {
                await channel.send(messageContent);
            }
            await channel.send({ embeds: [embed] });
        } catch (error) {
            logger.error(`Error sending to ${logName}:`, error);
        }
    };

    // Admin Log
    // Note: warn/kick used different admin log channels in previous code sometimes.
    // warns -> adminWarnLogs, bans -> adminLogs. 
    // We need to distinguish based on type.
    let adminChannelId = ids.channels.adminLogs;
    if (type === 'Warn' || type === 'Warn Removed') {
        await sendToChannel(ids.channels.publicLogs, 'Public Log');
        adminChannelId = ids.channels.adminWarnLogs;
    }

    await sendToChannel(adminChannelId, 'Admin Log');
}

module.exports = { logModerationAction };
