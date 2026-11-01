const {
	SlashCommandBuilder,
	PermissionFlagsBits,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ChannelSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	MessageFlags,
} = require('discord.js');
const {
	CHANNEL_DEFINITIONS,
	getChannelId,
	getChannelSource,
	setChannelId,
	resetChannelId,
} = require('../../utils/channelConfig.js');
const logger = require('../../logger.js');

const PANEL_TIMEOUT = 5 * 60 * 1000;
const ALL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice];

/** Embed récapitulatif de tous les salons configurables */
function buildOverviewEmbed() {
	const lines = Object.entries(CHANNEL_DEFINITIONS).map(([key, def]) => {
		const id = getChannelId(key);
		const source = getChannelSource(key);
		const value = id ? `<#${id}>` : '*non défini*';
		const tag = source === 'custom' ? ' ✏️' : '';
		return `**${def.label}** — ${value}${tag}`;
	});

	return new EmbedBuilder()
		.setColor('#9013fe')
		.setTitle('⚙️ Configuration des salons')
		.setDescription(lines.join('\n'))
		.setFooter({ text: '✏️ = modifié via le bot · sinon valeur par défaut (ids.json)' });
}

/** Menu déroulant pour choisir quel paramètre modifier */
function buildOverviewComponents() {
	const select = new StringSelectMenuBuilder()
		.setCustomId('cfg:pick')
		.setPlaceholder('Choisis le salon à modifier…')
		.addOptions(Object.entries(CHANNEL_DEFINITIONS).map(([key, def]) => ({
			label: def.label,
			description: def.description.slice(0, 100),
			value: key,
		})));

	return [new ActionRowBuilder().addComponents(select)];
}

/** Vue d'édition d'un paramètre : sélecteur de salon natif Discord */
function buildEditView(key) {
	const def = CHANNEL_DEFINITIONS[key];
	const currentId = getChannelId(key);

	const channelSelect = new ChannelSelectMenuBuilder()
		.setCustomId(`cfg:set:${key}`)
		.setPlaceholder('Sélectionne le nouveau salon')
		.setChannelTypes(def.types)
		.setMinValues(1)
		.setMaxValues(1);

	if (currentId) channelSelect.setDefaultChannels(currentId);

	const buttons = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('cfg:back')
			.setLabel('Retour')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji('↩️'),
		new ButtonBuilder()
			.setCustomId(`cfg:reset:${key}`)
			.setLabel('Valeur par défaut')
			.setStyle(ButtonStyle.Danger)
			.setEmoji('🔄')
			.setDisabled(getChannelSource(key) !== 'custom'),
	);

	const embed = new EmbedBuilder()
		.setColor('#9013fe')
		.setTitle(`⚙️ ${def.label}`)
		.setDescription(`${def.description}\n\nSalon actuel : ${currentId ? `<#${currentId}>` : '*non défini*'}`);

	return {
		embeds: [embed],
		components: [new ActionRowBuilder().addComponents(channelSelect), buttons],
	};
}

function overviewPayload(content = null) {
	return { content, embeds: [buildOverviewEmbed()], components: buildOverviewComponents() };
}

/** Gère un clic dans le panneau interactif */
async function handlePanelInteraction(i) {
	const [, action, key] = i.customId.split(':');

	if (action === 'pick') {
		return i.update({ content: null, ...buildEditView(i.values[0]) });
	}

	if (action === 'back') {
		return i.update(overviewPayload());
	}

	if (action === 'set') {
		const channelId = i.values[0];
		await setChannelId(key, channelId, i.user.id);
		return i.update(overviewPayload(`✅ **${CHANNEL_DEFINITIONS[key].label}** → <#${channelId}>`));
	}

	if (action === 'reset') {
		await resetChannelId(key);
		return i.update(overviewPayload(`🔄 **${CHANNEL_DEFINITIONS[key].label}** remis sur la valeur par défaut.`));
	}
}

/** /config salons — panneau interactif */
async function runPanel(interaction) {
	const response = await interaction.reply({
		...overviewPayload(),
		flags: MessageFlags.Ephemeral,
		withResponse: true,
	});

	const message = response.resource?.message;
	if (!message) return;

	const collector = message.createMessageComponentCollector({
		filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('cfg:'),
		time: PANEL_TIMEOUT,
	});

	collector.on('collect', async (i) => {
		try {
			await handlePanelInteraction(i);
		} catch (error) {
			logger.error('Erreur dans le panneau /config :', error);
			const payload = { content: '❌ Impossible d\'enregistrer la modification.', flags: MessageFlags.Ephemeral };
			await (i.replied || i.deferred ? i.followUp(payload) : i.reply(payload)).catch(() => null);
		}
	});

	collector.on('end', () => {
		interaction.editReply({ content: '⌛ Panneau expiré, relance `/config salons` pour continuer.', components: [] }).catch(() => null);
	});
}

/** /config salon cle:<…> salon:<#…> — modification directe */
async function runQuickSet(interaction) {
	const key = interaction.options.getString('cle', true);
	const channel = interaction.options.getChannel('salon', true);
	const def = CHANNEL_DEFINITIONS[key];

	if (!def) {
		return interaction.reply({ content: '❌ Paramètre inconnu.', flags: MessageFlags.Ephemeral });
	}
	if (!def.types.includes(channel.type)) {
		return interaction.reply({ content: `❌ Type de salon invalide pour **${def.label}**.`, flags: MessageFlags.Ephemeral });
	}

	await setChannelId(key, channel.id, interaction.user.id);
	return interaction.reply({ content: `✅ **${def.label}** → <#${channel.id}>`, flags: MessageFlags.Ephemeral });
}

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('config')
		.setDescription('Configure les salons utilisés par le bot')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(sub => sub
			.setName('salons')
			.setDescription('Ouvre le panneau de configuration des salons'))
		.addSubcommand(sub => sub
			.setName('salon')
			.setDescription('Change directement un salon')
			.addStringOption(opt => opt
				.setName('cle')
				.setDescription('Le paramètre à modifier')
				.setRequired(true)
				.addChoices(...Object.entries(CHANNEL_DEFINITIONS).map(([key, def]) => ({ name: def.label, value: key }))))
			.addChannelOption(opt => opt
				.setName('salon')
				.setDescription('Le nouveau salon')
				.setRequired(true)
				.addChannelTypes(...ALL_TYPES))),

	async execute(interaction) {
		const sub = interaction.options.getSubcommand();
		if (sub === 'salons') return runPanel(interaction);
		if (sub === 'salon') return runQuickSet(interaction);
	},
};
