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
                .setRequired(true))
        .addStringOption(option =>                          // ← Nouveau
            option.setName('banniere')
                .setDescription('URL de la bannière à afficher dans l\'embed')
                .setRequired(false)),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const titre = interaction.options.getString('titre');
        const description = interaction.options.getString('description');
        const banniere = interaction.options.getString('banniere'); // ← Nouveau

        const embed = new EmbedBuilder()
            .setColor('#9013fe')
            .setTitle(titre)
            .setDescription(description)
            .addFields({ name: 'Rôle', value: `<@&${role.id}>` })
            .setTimestamp();

        // Ajout de la bannière si une URL est fournie
        if (banniere) {
            embed.setImage(banniere);
        }

        const button = new ButtonBuilder()
            .setCustomId(`toggle_role_${role.id}`)
            .setLabel('Obtenir / Retirer le rôle')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎭');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ content: 'Embed envoyé !', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};