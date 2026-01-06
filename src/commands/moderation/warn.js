const { SlashCommandBuilder } = require('discord.js');
const { Punishments } = require('#database');
const { Op } = require('sequelize');
const logger = require('#logger');
const { ensureUserExists } = require('#utils/databaseUtils.js');
const { logModerationAction } = require('#utils/loggerUtils.js');
const { hasStaffRole } = require('#utils/permissionUtils.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Warn un utilisateur du serveur')
		.addUserOption(option =>
			option.setName('utilisateur')
				.setDescription('L\'utilisateur à warnir')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('raison')
				.setDescription('La raison du warn')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });
		try {
			const warnedUser = interaction.options.getUser('utilisateur');
			if (!warnedUser) {
				return interaction.editReply({ content: 'Impossible de récupérer l\'utilisateur, à t\'il quitté le serveur ?', ephemeral: true });
			}

			const reason = interaction.options.getString('raison');
			const staffMember = interaction.member.user;
			if (!staffMember) {
				return interaction.editReply({ content: 'Impossible de récupérer le responsable', ephemeral: true });
			}

			if (!hasStaffRole(interaction)) {
				return interaction.editReply({ content: 'Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.', ephemeral: true });
			}

			const user = await ensureUserExists(warnedUser.id, warnedUser.username);
			const punisher = await ensureUserExists(staffMember.id, staffMember.username);

			logger.debug('user', user);
			await Punishments.create({
				fk_user: user.pk_user,
				fk_punisher: punisher.pk_user,
				reason: reason,
				type: 'warn',
			});

			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
			const warnCount = await Punishments.count({ where: { fk_user: user.pk_user, type: 'warn', createdAt: { [Op.gte]: threeMonthsAgo } } });

			if (warnCount >= 3) {
				await interaction.guild.members.ban(warnedUser.id, { reason: reason });
				await logModerationAction(interaction, warnedUser, staffMember, reason, 'Ban');
			} else {
				await logModerationAction(interaction, warnedUser, staffMember, reason, 'Warn');
			}

			await interaction.editReply({ content: `L'utilisateur <@${warnedUser.id}> a été averti pour la raison suivante : ${reason}`, ephemeral: true });
		} catch (error) {
			logger.error('Erreur lors de l\'exécution de la commande warn :', error);
			await interaction.editReply({ content: 'Une erreur est survenue lors de l\'exécution de la commande.', ephemeral: true });
		}
	},
};