const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { DEFINITIONS, getSetting, setSetting, resetSetting } = require('../../utils/imageSpamSettings.js');
const { buildReminder } = require('../../handlers/imageSpamWatch.js');
const { getChannelId } = require('../../utils/channelConfig.js');
const logger = require('../../logger.js');

const MAX_CHANNELS = 10;
const TEXT = [ChannelType.GuildText, ChannelType.GuildAnnouncement];

function formatValue(key) {
	const value = getSetting(key);
	if (key === 'channels') return value.length ? value.map(id => `<#${id}>`).join(', ') : '*aucun — anti-spam inactif*';
	if (key === 'exemptBoosters') return value ? 'oui' : 'non';
	if (key === 'message') return null;
	return `**${value}** ${DEFINITIONS[key].unit}`;
}

function buildOverview() {
	const lines = Object.keys(DEFINITIONS)
		.filter(key => key !== 'message')
		.map(key => `**${DEFINITIONS[key].label}** — ${formatValue(key)}`);

	const redirectId = getChannelId('imageRedirect');
	lines.push(`**Salon images (redirection)** — ${redirectId ? `<#${redirectId}>` : '*non défini (via /config)*'}`);
	lines.push('', '**Aperçu du rappel :**');

	return [
		new EmbedBuilder()
			.setColor('#9013fe')
			.setTitle('🖼️ Anti-spam d\'images')
			.setDescription(lines.join('\n'))
			.setFooter({ text: 'Staff toujours exempté · GIFs Tenor/Giphy ignorés · emojis seuls ignorés' }),
		buildReminder(),
	];
}

const reply = (interaction, content, embeds) =>
	interaction.reply({ content, embeds, flags: MessageFlags.Ephemeral });

async function runSettings(interaction) {
	const options = {
		threshold: interaction.options.getInteger('seuil'),
		windowMin: interaction.options.getInteger('fenetre'),
		cooldownSec: interaction.options.getInteger('cooldown'),
		deleteAfterSec: interaction.options.getInteger('suppression'),
		exemptBoosters: interaction.options.getBoolean('boosters_exemptes'),
	};
	const changes = Object.entries(options).filter(([, v]) => v !== null);
	if (!changes.length) return reply(interaction, 'ℹ️ Aucun réglage fourni.', buildOverview());

	for (const [key, value] of changes) await setSetting(key, value, interaction.user.id);
	return reply(interaction, `✅ ${changes.length} réglage(s) mis à jour.`, buildOverview());
}

async function runMessage(interaction) {
	const text = interaction.options.getString('texte');
	if (!text) {
		await resetSetting('message');
		return reply(interaction, '🔄 Message remis par défaut.', buildOverview());
	}
	// Permet d'écrire « \n » pour un retour à la ligne dans l'option slash
	await setSetting('message', text.replaceAll('\\n', '\n'), interaction.user.id);
	return reply(interaction, '✅ Message mis à jour.', buildOverview());
}

async function runChannel(interaction, add) {
	const channel = interaction.options.getChannel('salon', true);
	const current = getSetting('channels');

	if (add) {
		if (current.includes(channel.id)) return reply(interaction, `ℹ️ <#${channel.id}> est déjà surveillé.`);
		if (current.length >= MAX_CHANNELS) return reply(interaction, `❌ Maximum ${MAX_CHANNELS} salons surveillés.`);
		await setSetting('channels', [...current, channel.id], interaction.user.id);
		return reply(interaction, `✅ <#${channel.id}> est maintenant surveillé.`, buildOverview());
	}

	if (!current.includes(channel.id)) return reply(interaction, `ℹ️ <#${channel.id}> n'est pas surveillé.`);
	await setSetting('channels', current.filter(id => id !== channel.id), interaction.user.id);
	return reply(interaction, `✅ <#${channel.id}> n'est plus surveillé.`, buildOverview());
}

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('antispam')
		.setDescription('Configure le rappel anti-spam d\'images')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(sub => sub
			.setName('voir')
			.setDescription('Affiche les réglages actuels et un aperçu du rappel'))
		.addSubcommand(sub => sub
			.setName('reglages')
			.setDescription('Modifie un ou plusieurs réglages')
			.addIntegerOption(opt => opt.setName('seuil').setDescription('Images d\'affilée tolérées avant le rappel').setMinValue(1).setMaxValue(50))
			.addIntegerOption(opt => opt.setName('fenetre').setDescription('Minutes sans image avant remise à zéro de la série').setMinValue(1).setMaxValue(1440))
			.addIntegerOption(opt => opt.setName('cooldown').setDescription('Secondes minimum entre deux rappels').setMinValue(0).setMaxValue(86400))
			.addIntegerOption(opt => opt.setName('suppression').setDescription('Secondes avant suppression du rappel (0 = jamais)').setMinValue(0).setMaxValue(3600))
			.addBooleanOption(opt => opt.setName('boosters_exemptes').setDescription('Les images des boosters ne comptent pas')))
		.addSubcommand(sub => sub
			.setName('message')
			.setDescription('Change le texte du rappel (vide = par défaut)')
			.addStringOption(opt => opt
				.setName('texte')
				.setDescription('{salon} = salon images, \\n = retour à la ligne')
				.setMaxLength(250)))
		.addSubcommand(sub => sub
			.setName('ajouter-salon')
			.setDescription('Surveille un salon de discussion')
			.addChannelOption(opt => opt.setName('salon').setDescription('Le salon').setRequired(true).addChannelTypes(...TEXT)))
		.addSubcommand(sub => sub
			.setName('retirer-salon')
			.setDescription('Arrête de surveiller un salon')
			.addChannelOption(opt => opt.setName('salon').setDescription('Le salon').setRequired(true).addChannelTypes(...TEXT))),

	async execute(interaction) {
		try {
			const sub = interaction.options.getSubcommand();
			if (sub === 'voir') return await reply(interaction, null, buildOverview());
			if (sub === 'reglages') return await runSettings(interaction);
			if (sub === 'message') return await runMessage(interaction);
			if (sub === 'ajouter-salon') return await runChannel(interaction, true);
			if (sub === 'retirer-salon') return await runChannel(interaction, false);
		} catch (error) {
			logger.error('Erreur dans /antispam :', error);
			const payload = { content: '❌ Impossible d\'enregistrer la modification.', flags: MessageFlags.Ephemeral };
			await (interaction.replied ? interaction.followUp(payload) : interaction.reply(payload)).catch(() => null);
		}
	},
};
