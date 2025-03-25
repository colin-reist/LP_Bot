const { Events, Collection, EmbedBuilder } = require('discord.js');
const logger = require('../../logger.js');
/**
 * Capte les interactions
 * @param {Interaction} interaction L'interaction créée par l'utilisateur
 * @returns
 */
module.exports = (client) => {
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        logger.info('Utilisation d\'une commande !');

        const { cooldowns } = client;
        const command = client.commands.get(interaction.commandName);

        const { commandName } = interaction;

        if (commandName === 'addtag') {
            logger.info('addtag');
            const tagName = interaction.options.getString('name');
            const tagDescription = interaction.options.getString('description');

            try {
                logger.info('-------Création du tag-------');
                // equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
                const tag = await Tags.create({
                    messageID: tagName,
                    description: tagDescription,
                    username: interaction.user.username,
                });
                logger.info(' -> Tag créé \n' + ' Contenu du tag: \n' + 'MessageID: ' + tag.messageID + '\nMessageAuthorName: ');
                return interaction.reply(`Tag ${tag.messageID} added.`);
            }
            catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    return interaction.reply('That tag already exists.');
                }

                return interaction.reply('Something went wrong with adding a tag.');
            }
        }
        else if (commandName === 'tag') {
            logger.info('tag');
            const tagName = interaction.options.getString('name');

            // equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
            const tag = await suggestion.findOne({ where: { suggestionId: tagName } });

            if (tag) {
                // equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
                tag.increment('usage_count');

                return interaction.reply(tag.get('description'));
            }

            return interaction.reply(`Could not find tag: ${tagName}`);
        }
        else if (commandName === 'edittag') {
            logger.info('edittag');
            const tagName = interaction.options.getString('name');
            const tagDescription = interaction.options.getString('description');

            // equivalent to: UPDATE tags (description) values (?) WHERE name='?';
            const affectedRows = await Tags.update({ description: tagDescription }, { where: { name: tagName } });

            if (affectedRows > 0) {
                return interaction.reply(`Tag ${tagName} was edited.`);
            }

            return interaction.reply(`Could not find a tag with name ${tagName}.`);
        }
        else if (commandName == 'taginfo') {
            logger.info('taginfo');
            const tagName = interaction.options.getString('name');

            // equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
            const tag = await suggestion.findOne({ where: { suggestionId: tagName } });

            if (tag) {
                return interaction.reply(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
            }

            return interaction.reply(`Could not find tag: ${tagName}`);
        }
        else if (commandName === 'showtags') {
            // equivalent to: SELECT name FROM tags;
            logger.info('showtags');
            const tagList = await suggestion.findAll({ attributes: ['suggestionId'] });
            const tagString = tagList.map(t => t.suggestionId).join(', ') || 'No tags set.';

            return interaction.reply(`List of tags: ${tagString}`);
        }
        else if (commandName === 'deletetag') {
            logger.info('deletetag');
            const tagName = interaction.options.getString('name');
            // equivalent to: DELETE from tags WHERE name = ?;
            const rowCount = await Tags.destroy({ where: { messageID: tagName } });

            if (!rowCount) return interaction.reply('That tag doesn\'t exist.');

            return interaction.reply('Tag deleted.');
        }
        else if (commandName === 'resettag') {
            logger.info('resettag');
            Tags.sync({ force: true });

            return interaction.reply('Tags reset.');
        } else if (commandName === 'suggérer') {
            const actualSuggestions = await suggestion.findOne({ where: { suggestionId: interaction.id } });
            logger.info(actualSuggestions);
            if (actualSuggestions === null) {
                let messages = null;
                if (interaction.options.getAttachment('image') === null) {
                    try {
                        logger.info('création de l\'embed sans image');
                        const embed = new EmbedBuilder()
                            .setColor('#EBBC4E')
                            .setTitle('✨ Construction de votre suggestion ✨');

                        const channelID = interaction.channel;
                        messages = await channelID.send({ embeds: [embed] });
                    } catch (error) {
                        console.error(error);
                    }
                } else {
                    try {
                        logger.info('création de l\'embed avec image');
                        const embed = new EmbedBuilder()
                            .setColor('#EBBC4E')
                            .setTitle('✨ Construction de votre suggestion ✨');
                        const channelID = interaction.channel;
                        messages = await channelID.send({ embeds: [embed] });
                    } catch (error) {
                        console.error(error);
                    }
                }

                logger.info('Rajout dans la table');
                const suggestionId = messages.id;
                const suggestionName = interaction.options.getString('nom');
                const suggestionSuggestion = interaction.options.getString('suggestion');
                const suggestionSuggerant = interaction.options.getUser('suggerant').id;
                const suggestionCount = 0;
                let existingImage = null;

                if (interaction.options.getAttachment('image') === null) {
                    existingImage = '';
                } else {
                    existingImage = interaction.options.getAttachment('image').url;
                }

                try {
                    logger.info('-------Création de la suggestion-------');
                    // equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
                    const tag = await suggestion.create({
                        suggestionId: suggestionId,
                        suggestionName: suggestionName,
                        suggestionSuggestion: suggestionSuggestion,
                        suggestionSuggerant: suggestionSuggerant,
                        suggestionCountTrue: suggestionCount,
                        suggestionCountFalse: suggestionCount,
                        suggestionImage: existingImage,
                    });
                    logger.info('Contenu de la suggestion: \n' + 'suggestionId: ' + tag.suggestionId + '\nsuggestionName: '
                        + tag.suggestionName + '\nsuggestionDescription: ' + tag.suggestionSuggestion
                        + '\nsuggestionSuggerant: ' + tag.suggestionSuggerant + '\nsuggestionCount: ' + tag.suggestionCount + '\nexistingImage: '
                        + tag.suggestionImage + '\n---------------------------');
                } catch (error) {
                    console.error(error);
                }
                await messages.react('✅');
                await messages.react('❌');
            }
        }

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
            console.error(error);
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

                const logChannel = client.channels.cache.get('1333850350867710073');
                if (logChannel) {
                    logChannel.send({ embeds: [errorEmbed] });
                }
            } catch (error) {
                console.error('Error while sending error message:', error);
            }
        }
    });
};
