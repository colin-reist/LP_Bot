const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    category: 'utility',
    data: new SlashCommandBuilder()
        .setName('role-button')
        .setDescription('Envoie un embed avec un bouton pour obtenir/retirer un rôle')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à donner/retirer')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Titre de l\'embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description de l\'embed')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Permission insuffisante.', ephemeral: true });
        }

        const role = interaction.options.getRole('role');
        const titre = interaction.options.getString('titre');
        const description = interaction.options.getString('description');

        const embed = new EmbedBuilder()
            .setColor('#9013fe')
            .setTitle(titre)
            .setDescription(description)
            .addFields({ name: 'Rôle', value: `<@&${role.id}>` })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId(`toggle_role_${role.id}`)  // L'ID du rôle est encodé dans le customId
            .setLabel('Obtenir / Retirer le rôle')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎭');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ content: 'Embed envoyé !', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};