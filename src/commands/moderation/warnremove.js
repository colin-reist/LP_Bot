const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Punishments, Users } = require('../../../database/database.js');
const ids = require('../../../config/ids.json');
module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('remove')
		.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur qui va perdre son warn').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison').setRequired(true))
		.setDescription('Retire le warn d\'un utilisateur du serveur'),
	async execute(interaction) {
		// Check if the user has the required role
		const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
		if (!interaction.member.roles.cache.has(requiredRole.id)) {
			return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
		}

		const unWarnedUser = interaction.options.getUser('utilisateur');
		const reason = interaction.options.getString('raison');

		// Check if the user has been warned
		const user = await Users.findOne({ where: { discord_identifier: unWarnedUser.id } });
		if (!Users) {
			return interaction.reply({ content: 'This user has not been warned.', ephemeral: true });
		}
		const warnCount = await Punishments.count({ where: { fk_user: unWarnedUser.id, type: 'warn' } });
		if (warnCount === 0) {
			return interaction.reply({ content: '⚠️This user has not been warned.', ephemeral: true });
		}

		// Remove the warn
		await Punishments.destroy({ where: { fk_user: badUser.pk_user, type: 'warn' } });

		// log the action
		const adminLogWarnChannel = interaction.guild.channels.cache.get(ids.channels.adminWarnLogs);
		const embed = new EmbedBuilder()
			.setColor('#00FF00')
			.setTitle('Warn removed')
			.setDescription(`The warn of ${unWarnedUser.username} has been removed by ${interaction.user.username}`)
			.addFields({
				name: 'Reason',
				value: reason,
			})
			.setFooter({
				text: 'Lewd Paradise au service de tout les hornys',
				iconURL: 'https://i.imgur.com/PQtvZLa.gif',
			});
		adminLogWarnChannel.send({ embeds: [embed] });
	}
};