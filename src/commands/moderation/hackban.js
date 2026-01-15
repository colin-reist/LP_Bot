const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { bans, badUsers: badUserModel, staffMembers } = require('../../../database/database.js');
const logger = require('../../logger.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('hackban')
		.setDescription('Ban un utilisateur qui n\'est pas sur le serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption(option => option.setName('id').setDescription('L\'identifiant de la personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true)),
	async execute(interaction) {
		await interaction.reply({ content: 'Ban en cours...', ephemeral: true });

		// Double vérification des permissions (sécurité renforcée)
		if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
			return interaction.editReply({
				content: '❌ Vous n\'avez pas la permission `Bannir des membres`.',
				ephemeral: true
			});
		}

		const staff = interaction.member.user;
		const staffId = staff.id;

		let user_to_ban_id = undefined;
		try {
			user_to_ban_id = interaction.options.getString('id');
		} catch (error) {
			interaction.editReply({ content: `Erreur : ${error}`, ephemeral: true });
			return;
		}

		// Fetch the guild member, if they are in the server
		let member;
		try {
			member = await interaction.guild.members.fetch(user_to_ban_id);
		} catch (error) {
			member = null; // Users is not in the server
		}

		// Check if the executing user is a staff member
		const staffMember = await staffMembers.findOne({ where: { sm_user_id: staffId } });
		if (!staffMember) {
			return interaction.editReply({ content: 'Tu n\'es pas un staff', ephemeral: true });
		}

		// Check if the user is already in the badUsers list
		const badUser = await badUserModel.findOne({ where: { bu_id: user_to_ban_id } });
		if (!badUser) {
			try {
				await badUserModel.create({
					bu_id: user_to_ban_id,
					bu_name: user.username,
				});
			} catch (error) {
				logger.error('Contrainte de clé unique violée sur la table badUsers');
			}
		}

		const raison = interaction.options.getString('raison');
        
		try {
            // Ban the user by their ID
            logger.debug(user_to_ban_id);
			await interaction.guild.members.ban(user_to_ban_id, { reason: raison });
		} catch (error) {
            await interaction.editReply({ content: `Erreur lors du ban de l\'utilisateur ${error}`, ephemeral: true });
            return;
		}
        
        try {
            await interaction.editReply({ content: `L'utilisateur <@${user_to_ban_id}> a été banni pour la raison suivante : ${raison}` });
        } catch (error) {
            logger.error(error);
            return;
        }

		try {
			// Send a log embed to the ban-log channel
			const channel = interaction.guild.channels.cache.find(channel => channel.name === 'ban-log');
			const embed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Ban')
				.setDescription('Un utilisateur a été banni')
				.addFields(
					{ name: 'Utilisateur', value: `<@${user_to_ban_id}>` },
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: `<@${staff.id}>` },
				)
				.setTimestamp()
			channel.send({ embeds: [embed] });
		} catch (error) {
			logger.error('Erreur lors de l\'envoie du log' + error);
		}
	},
};
