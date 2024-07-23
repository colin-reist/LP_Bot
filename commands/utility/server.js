const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('server-info')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDescription('Provides information about the server.'),
	async execute(interaction) {
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