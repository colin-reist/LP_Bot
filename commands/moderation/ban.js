const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { bans, badUsers: badUserModel, staffMembers } = require('../../database.js');

module.exports = {
	category: 'moderation',
	data: new SlashCommandBuilder()
		.setName('ban')
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true))
		.addUserOption(option => option.setName('user').setDescription('L\'ID de la personne à bannir').setRequired(true))
		.setDescription('Ban un utilisateur du serveur'),
	async execute(interaction) {
		await interaction.reply({ content: 'Ban en cours...', ephemeral: true });

		const staff = interaction.member.user;
		const staffId = staff.id;

		let user_to_ban = undefined;
		let user_to_ban_id = undefined;
		try {
			user_to_ban = interaction.options.getUser('user');
			user_to_ban_id = user_to_ban.id;
		} catch (error) {
			interaction.editReply({ content: `Erreur : ${error}`, ephemeral: true });
			return;
		}

		console.log(user_to_ban_id);

		// Fetch the guild member, if they are in the server
		let member;
		try {
			member = await interaction.guild.members.fetch(user_to_ban_id);
		} catch (error) {
			member = null; // User is not in the server
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
				console.log('Contrainte de clé unique violée sur la table badUsers');
			}
		}

		const foundBadUser = await badUserModel.findOne({ where: { bu_id: user_to_ban_id } });
		const fkBadUser = foundBadUser.pk_badUsers;

		const staffMemberId = await staffMembers.findOne({ where: { sm_user_id: staffId } });
		const fkStaffMember = staffMemberId.pk_staffMembers;

		const raison = interaction.options.getString('raison');

		// Add the ban to the database
		try {
			await bans.create({
				ba_reason: raison,
				ba_date: new Date(),
				ba_fk_badUsers: fkBadUser,
				ba_fk_staffMembers: fkStaffMember,
			});
		} catch (error) {
			console.log('Erreur lors du rajout du ban dans la base de données');
		}

		try {
			await interaction.editReply({ content: `L'utilisateur <@${user_to_ban_id}> a été banni pour la raison suivante : ${raison}` });
		} catch (error) {
			console.log(error);
			return;
		}

		// Send an embed to the user if they are in the server
		if (member) {
			const embedToUser = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Ban')
				.setDescription('Vous avez été banni')
				.addFields(
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: `<@${staff.id}>` },
				)
				.setTimestamp()
				.setThumbnail(staff.avatarURL());
			try {
				await member.send({ embeds: [embedToUser] });
			} catch (error) {
				console.log(error);
			}
		}

		try {
			// Ban the user by their ID
			await interaction.guild.members.ban(user_to_ban_id, { reason: raison });
		} catch (error) {
			await interaction.editReply({ content: 'Erreur lors du ban de l\'utilisateur', ephemeral: true });
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
				.setThumbnail(user_to_ban.avatarURL());
			channel.send({ embeds: [embed] });
		} catch (error) {
			console.log('Erreur lors de l\'envoie du log' + error);
		}
	},
};
