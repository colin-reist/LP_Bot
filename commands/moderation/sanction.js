// Command automatique qui permet de donner la bonne sanction selon ce qu'a fait le membre
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('sanction')
        .setDescription('Sanctionner un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre à sanctionner')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la sanction')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de sanction')
                .setRequired(true)
                .addChoices(
                    { name: 'Mute', value: 'mute' },
                    { name: 'Kick', value: 'kick' },
                    { name: 'Ban', value: 'ban' }
                )),
    async execute(interaction) {
        

        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'Tu n\'est pas un membre du staff', ephemeral: true });
        }

        const member = interaction.options.getMember('membre');
        const reason = interaction.options.getString('raison');
        const type = interaction.options.getString('type');

        const sanctionEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`Sanction pour ${member.user.tag}`)
            .addFields(
            { name: 'Membre', value: member.toString(), inline: true },
            { name: 'Type', value: type, inline: true },
            { name: 'Raison', value: reason, inline: true }
            )
            .setTimestamp()
            .setFooter(`Sanction par ${interaction.user.tag}`, interaction.user.displayAvatarURL());

        const embedToUser = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(type.charAt(0).toUpperCase() + type.slice(1))
            .setDescription(`Vous avez été ${type}`)
            .addFields(
            { name: 'Raison', value: reason },
            { name: 'Staff', value: `<@${interaction.user.id}>` },
            )
            .setTimestamp()
            .setThumbnail(interaction.user.displayAvatarURL());

        try {
            await member.send({ embeds: [embedToUser] });
        } catch (error) {
            console.log(error);
        }

        if (type === 'mute') {
            member.roles.add('965755928974618735');
            interaction.reply({ content: 'Membre muté', ephemeral: true });
        } else if (type === 'kick') {
            member.kick(reason);
            interaction.reply({ content: 'Membre kick', ephemeral: true });
        } else if (type === 'ban') {
            member.ban({ reason: reason });
            interaction.reply({ content: 'Membre banni', ephemeral: true });
        }

        interaction.guild.channels.cache.get('965755928974618735').send({ embeds: [sanctionEmbed] });
    }
};