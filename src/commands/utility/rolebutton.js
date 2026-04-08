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
        .addStringOption(option =>
            option.setName('banniere')
                .setDescription('URL de la bannière à afficher dans l\'embed')
                .setRequired(false)),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const titre = interaction.options.getString('titre');
        const description = interaction.options.getString('description');
        const banniere = interaction.options.getString('banniere');

        const embed = new EmbedBuilder()
            .setColor('#9013fe')
            .setTitle(`🎨 ${titre}`)
            .setDescription(`${description}\n\n━━━━━━━━━━━━━━━━━━━━━━`)
            .addFields(
                { name: '🎭 Rôle attribué', value: `<@&${role.id}>`, inline: true },
                { name: '👥 Membres', value: `${role.members.size} membres`, inline: true },
            )
            .setFooter({ text: '🔔 Clique sur un bouton pour obtenir ou retirer le rôle' })
            .setTimestamp();

        if (banniere) {
            embed.setImage(banniere);
        }

        const buttonAdd = new ButtonBuilder()
            .setCustomId(`add_role_${role.id}`)
            .setLabel('Obtenir le rôle')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const buttonRemove = new ButtonBuilder()
            .setCustomId(`remove_role_${role.id}`)
            .setLabel('Retirer le rôle')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(buttonAdd, buttonRemove);

        await interaction.reply({ content: '✅ Embed envoyé !', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row] });
    },
};