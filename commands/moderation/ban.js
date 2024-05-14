const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { bans, badUsers: badUserModel, staffMembers } = require('../../database.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.addUserOption(option => option.setName('utilisateur').setDescription('La personne à bannir').setRequired(true))
		.addStringOption(option => option.setName('raison').setDescription('La raison du ban').setRequired(true))
		.setDescription('Rename all members of the server'),
	async execute(interaction) {

		await interaction.reply({ content: 'Ban en cours...', ephemeral: true });

		// Capture le staff executant la commande
		const staff = interaction.member.user;
        const staffId = staff.id;

		// Capture la personne visée par la commande
		const user = interaction.options.getUser('utilisateur');
        const member = await interaction.guild.members.fetch(user.id);

		// Check si le staff executant la commande est un staff
        const staffMember = await staffMembers.findOne({ where: { sm_user_id: staffId } });
        if (!staffMember) {
            return interaction.editReply({ content: 'Tu n\'es pas un staff', ephemeral: true });
        }
		
		// Check si l'utilisateur est déjà sur la liste des mauvais utilisateurs
		// Si l'utilisateur n'y est pas on le rajoute à la liste de badUsers
		const badUser = await badUserModel.findOne({ where: { bu_id: user.id } });
		if (!badUser) {
			try {
				await badUserModel.create({
					bu_id: user.id,
					bu_name: user.username,
				});
			} catch (SequelizeUniqueConstraintError) {
				console.log('Constrainte de clé unique violée sur la table badUsers');
			}
		}

		// Capture la fk de l'utilisateur warni pour lier le warn à l'utilisateur
        const foundBadUser = await badUserModel.findOne({ where: { bu_id: user.id } });
        const fkBadUser = foundBadUser.pk_badUsers;

        // Capture la fk du staff executant la commande pour lier le warn au staff
        const staffMemberId = await staffMembers.findOne({ where: { sm_user_id: staffId } });
        const fkStaffMember = staffMemberId.pk_staffMembers;

		// Capture la raison du ban
		const raison = interaction.options.getString('raison');

		// Rajout du ban dans la base de donneés
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
			await interaction.editReply({ content: `L'utilisateur <@${user.id}> a été banni pour la raison suivante : ${raison}` });
		} catch (error) {
			console.log(error);
			return;
		}

		// Envoie un embed d'avertissement à l'utilisateur
		const embedToUser = new EmbedBuilder()
			.setColor('#FF0000')
			.setTitle('Ban')
			.setDescription('Vous avez été banni')
			.addFields(
				{ name: 'Raison', value: raison },
				{ name: 'Staff', value: '<@' + staff.id + '>' },
			)
			.setTimestamp()
			.setThumbnail(staff.avatarURL());
		try {
			await member.send({ embeds: [embedToUser] });
		} catch (error) {
			console.log(error);
			return;
		}

		try {
			// Ban l'utilisateur avec la raison
			await member.ban({ reason: raison });
		} catch (error) {
			console.log('Erreur lors du ban de l\'utilisateur' + error);
		}


		try {
			// Efface les messages de l'utilisateur
			const fetched = await interaction.channel.messages.fetch({ limit: 100 });
			const fetchedMessages = fetched.filter(msg => msg.author.id === user.id);
			await interaction.channel.bulkDelete(fetchedMessages)
		} catch (error) {
			console.log('Erreur lors de la suppression des messages de l\'utilisateur' + error);
		}

		try {
			// Envoie un embed dans le channel de modération
			const channel = interaction.guild.channels.cache.find(channel => channel.name === 'ban-log');
			const embed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Ban')
				.setDescription('Un utilisateur a été banni')
				.addFields(
					{ name: 'Utilisateur', value: '<@' + user.id + '>' },
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: '<@' + staff.id + '>' },
				)
				.setTimestamp()
				.setThumbnail(user.avatarURL());
			channel.send({ embeds: [embed] });
		} catch (error) {
			console.log('Erreur lors de l\'envoie du message dans le channel de modération' + error);
		}
	},
};