const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { runSmashOrPass } = require('../../handlers/smashOrPass.js');

module.exports = {
	category: 'fun',
	data: new SlashCommandBuilder()
		.setName('forcesmashorpass')
		.setDescription('Force the smash or pass command to run.')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const posted = await runSmashOrPass(interaction.client);
		await interaction.editReply(posted
			? '✅ Smash or Pass posté.'
			: '❌ Aucune image postée (pas d\'image trouvée ou salon cible introuvable), voir les logs.');
	},
};
