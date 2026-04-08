const { Events, Collection, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');
const { errorHandler } = require('../../utils/errorHandler.js');

/**
 * Capte les interactions
 * @param {Interaction} interaction L'interaction créée par l'utilisateur
 * @returns
 */
module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {

        // ── Gestion des boutons ──────────────────────────────────────────────
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('toggle_role_')) {
                const roleId = interaction.customId.replace('toggle_role_', '');
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({ content: '❌ Rôle introuvable.', ephemeral: true });
                }

                const member = interaction.member;
                const hasRole = member.roles.cache.has(roleId);

                try {
                    if (hasRole) {
                        await member.roles.remove(role);
                        return interaction.reply({
                            content: `✅ Le rôle **${role.name}** t'a été retiré.`,
                            ephemeral: true
                        });
                    } else {
                        await member.roles.add(role);
                        return interaction.reply({
                            content: `✅ Tu as obtenu le rôle **${role.name}** !`,
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    logger.error('Erreur toggle rôle:', error);
                    return interaction.reply({
                        content: '❌ Je n\'ai pas les permissions pour modifier ce rôle.',
                        ephemeral: true
                    });
                }
            }
            return; // Ignorer les autres boutons non gérés
        }
        // ────────────────────────────────────────────────────────────────────

        if (!interaction.isChatInputCommand()) return;

        logger.debug('Utilisation d\'une commande !');

        const { cooldowns } = client;
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const defaultCooldownDuration = 3;
        const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

            if (now < expirationTime) {
                const expiredTimestamp = Math.round(expirationTime / 1000);
                return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        try {
            await command.execute(interaction);

            if (interaction.client.healthCheck) {
                interaction.client.healthCheck.incrementMetric('commandsExecuted');
            }
        }
        catch (error) {
            if (interaction.client.healthCheck) {
                interaction.client.healthCheck.incrementMetric('errors');
            }
            await errorHandler.handleCommandError(error, interaction);

            try {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Error while executing command')
                    .setDescription(`There was an error while executing the command \`${command.data.name}\``)
                    .addFields(
                        { name: 'Error', value: error.message || 'Unknown error' },
                        { name: 'Error Type', value: error.name || 'Error' },
                        { name: 'Last user', value: `<@${interaction.user.id}>` },
                        { name: 'Command name', value: command.data.name },
                        { name: 'Time', value: `The error happened at : <t:${Math.floor(Date.now() / 1000)}:f>` }
                    )
                    .setImage("https://media1.tenor.com/m/sIB-6LgziVIAAAAC/spongebob-squarepants-spongebob.gif")
                    .setFooter({
                        text: "Lewd Paradise au service de tout les hornys",
                        iconURL: "https://i.imgur.com/PQtvZLa.gif",
                    });

                const logChannel = client.channels.cache.get(ids.channels.logs);
                if (logChannel) {
                    await logChannel.send({ embeds: [errorEmbed] });
                }
            } catch (logError) {
                logger.error('Error while sending error message to log channel:', logError);
            }
        }
    });
};