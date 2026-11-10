const { MessageFlags, PermissionsBitField } = require('discord.js');
const ids = require('#config/ids');

/**
 * Indique si un membre a le rôle Staff.
 * `ids.roles.staff` peut être un ID de rôle ou un nom de rôle ("Staff").
 * @param {import('discord.js').GuildMember|null|undefined} member
 * @returns {boolean}
 */
function isStaff(member) {
	if (!member?.roles?.cache) return false;
	const staffRef = ids.roles.staff;
	return /^\d+$/.test(staffRef)
		? member.roles.cache.has(staffRef)
		: member.roles.cache.some(role => role.name === staffRef);
}

/**
 * Raccourci pour une interaction ou un message.
 * @param {{ member?: import('discord.js').GuildMember }} context
 * @returns {boolean}
 */
function hasStaffRole(context) {
	return isStaff(context?.member);
}

/**
 * Vérification centralisée avant l'exécution d'une commande slash.
 * - Les permissions déclarées avec setDefaultMemberPermissions() sont revérifiées
 *   (un admin peut les surcharger dans les réglages d'intégration du serveur).
 * - `staffOnly: true` dans le module de la commande exige en plus le rôle Staff.
 *
 * Répond lui-même à l'interaction en cas de refus.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {{ data: any, staffOnly?: boolean }} command
 * @returns {Promise<boolean>} true si la commande peut s'exécuter
 */
async function checkCommandPermissions(interaction, command) {
	const required = command.data.default_member_permissions;

	if (required) {
		const needed = new PermissionsBitField(BigInt(required));
		if (!interaction.memberPermissions?.has(needed)) {
			const names = needed.toArray().map(p => `\`${p}\``).join(', ');
			await interaction.reply({
				content: `❌ Il te faut la permission ${names} pour utiliser cette commande.`,
				flags: MessageFlags.Ephemeral,
			});
			return false;
		}
	}

	if (command.staffOnly && !hasStaffRole(interaction)) {
		await interaction.reply({
			content: '❌ Tu dois avoir le rôle Staff pour utiliser cette commande.',
			flags: MessageFlags.Ephemeral,
		});
		return false;
	}

	return true;
}

module.exports = { isStaff, hasStaffRole, checkCommandPermissions };
