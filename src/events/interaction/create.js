const { Events, Collection, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
const ids = require('../../../config/ids.json');
/**
 * Capte les interactions
 * @param {Interaction} interaction L'interaction créée par l'utilisateur
 * @returns
 */
module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {
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
        }
        catch (error) {
            logger.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
            else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }

            try {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Error while executing command ')
                    .setDescription(`There was an error while executing the command \`${command.data.name}\``)
                    .addFields(
                        { name: 'Error', value: error.message },
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
                    logChannel.send({ embeds: [errorEmbed] });
                }
            } catch (error) {
                logger.error('Error while sending error message:', error);
            }
        }
    });
};
