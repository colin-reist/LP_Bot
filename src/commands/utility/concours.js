const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ids = require('../../../config/ids.json');

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('concours')
		.setDescription('Envoie le message du concours de la semaine.')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addStringOption(option =>
			option.setName('sujet')
				.setDescription('Le thème du concours')
				.setRequired(true)
		)
		.addAttachmentOption(option =>
			option.setName('image')
				.setDescription('Image d\'exemplpe pour le concours.')
				.setRequired(true)
		),
	async execute(interaction) {
		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.reply({
				content: '❌ Vous n\'avez pas la permission `Administrateur`.',
				flags: MessageFlags.Ephemeral
			});
		}

		// get command options
		const sujet = interaction.options.getString('sujet');
		const image = interaction.options.getAttachment('image').url;

		const embed = new EmbedBuilder()
			.setColor('#9013fe')
			.setTitle('🎨 Concours Hebdomadaire 🎨')
			.setDescription('Découvrez le thème du concours de la semaine et participez !')
			.addFields(
				{ name: '🖌️ Thème', value: `**${sujet}**`, inline: true },
				{
					name: '📜 Règles à respecter', value:
						'✔️ **Deux images max** par personne (envoyées séparément).\n' +
						'✔️ **Qualité minimum :** 500p (évitez les images trop pixélisées).\n' +
						'✔️ **Utilisez l’émoji suivant :** 🗳️ <:' + ids.emojis.vote + '>\n' +
						'✔️ **Tous les styles sont acceptés !**\n' +
						'✔️ **Réagissez** à votre propre image et à votre préférée pour plus d’interaction.\n' +
						'✔️ **Postez vos œuvres dans** 🏆 <#' + ids.channels.arts + '>.',
				},
				{
					name: '🕒 Déroulement', value:
						'📅 **Soumissions & votes** : 4 à 5 jours pour poster et voter.\n' +
						'🔒 **Fermeture des participations** après ce délai.\n' +
						'📉 **Première sélection** : les images les moins votées seront supprimées.',
				},
				{ name: '💡 Astuce', value: 'Prenez le temps de **regarder toutes les images** avant de voter !' },
			)
			.setTimestamp()
			.setImage(image)
			.setFooter({
				text: 'Lewd Paradise au service de tout les hornys',
				iconURL: 'https://i.imgur.com/PQtvZLa.gif',
			});

		await interaction.reply({ embeds: [embed] });
	},
};