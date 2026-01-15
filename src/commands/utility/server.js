const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('server-info')
		.setDescription('Provides information about the server.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Administrateur`.',
				ephemeral: true
			});
		}

		const guild = interaction.guild;
		const owner = await interaction.guild.fetchOwner();
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setURL('https://discord.js.org/')
			.setDescription(`Le serveur ${guild} à été créé le ${guild.createdAt} et est géré par ${owner}`)
			.setThumbnail(guild.bannerURL())
			.addFields(
				{ name: owner.user.username, value: `Le créateur de ce serveur à rejoins discord le ${owner.user.createdAt}` })
			.setImage(owner.user.displayAvatarURL())
			.setTimestamp()
			.setFooter({ text: 'Informations sur le serveur', iconURL: guild.iconURL() });

		await interaction.reply({ embeds: [exampleEmbed] });
	},
};