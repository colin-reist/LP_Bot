const { SlashCommandBuilder } = require('discord.js');
const { kicks, badUsers: badUserModel, staffMembers } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur à kick').setRequired(true))
        .addStringOption(option => option.setName('raison').setDescription('La raison du kick').setRequired(true))
        .setDescription('Kick un utilisateur du serveur'),
    async execute(interaction) {
        // Check if the user has the required role
        const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');
        if (!interaction.member.roles.cache.has(requiredRole.id)) {
            return interaction.reply({ content: 'You do not have the required role to use this command.', ephemeral: true });
        }
    
        await interaction.reply({ content: 'Kicking user...', ephemeral: true });
    
        // kick le membre puis enregistre le kick dans la base de données
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

		// Capture la raison du kick
		const raison = interaction.options.getString('raison');

		// Rajout du kick dans la base de donneés
		try {
			await kicks.create({
				ki_reason: raison,
				ki_date: new Date(),
				ki_fk_badUsers: fkBadUser,
				ki_fk_staffMembers: fkStaffMember,
			});
		} catch (error) {
			console.log('Erreur lors du rajout du kick dans la base de données');
		}

		try {
			await interaction.editReply({ content: `L'utilisateur <@${user.id}> a été kick pour la raison suivante : ${raison}` });
		} catch (error) {
			console.log(error);
			return;
		}
<<<<<<< Updated upstream
    
        // Envoie un embed d'avertissement à l'utilisateur
		const embedToUser = new EmbedBuilder()
			.setColor('#FF0000')
			.setTitle('Kick')
			.setDescription('Vous avez été kick')
			.addFields(
				{ name: 'Raison', value: raison },
				{ name: 'Staff', value: staff.username },
			)
			.setTimestamp()
			.setThumbnail(staff.displayAvatarURL());
		try {
			member.send({ embeds: [embedToUser] });
		} catch (error) {
			console.log(error);
			return;
		}
=======
>>>>>>> Stashed changes

		try {
				// Envoie un embed d'avertissement à l'utilisateur
			const embedToUser = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Kick')
				.setDescription('Vous avez été kick')
				.addFields(
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: staff.username },
				)
				.setTimestamp()
				.setThumbnail(staff.displayAvatarURL());
			member.send({ embeds: [embedToUser] });
		} catch (error) {
			console.log('Erreur lors de l\'envoie du messsage à l\'utilisateur' + error);
		}
		
		try {
			// kick l'utilisateur
			await member.kick({ reason: raison });
		} catch (error) {
			console.log('Erreur lors du kick de l\'utilisateur' + error);
		}

		
		try {
			// Envoie un embed dans le channel de modération
			const embedToLog = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Kick')
				.setDescription('Un utilisateur a été kick')
				.addFields(
					{ name: 'Utilisateur', value: member.user.username },
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: staff.username },
				)
				.setTimestamp()
				.setThumbnail(member.user.displayAvatarURL());
			const channel = client.channels.cache.get('1238538219168206950');
			channel.send({ embeds: [embedToLog] });
		} catch (error) {
			console.log('Erreur lors de l\'envoie du message dans le channel de modération' + error);
		}
    },
};