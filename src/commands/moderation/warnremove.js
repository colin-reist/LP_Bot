const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { warns, staffMembers, badUsers: badUserModel } = require('../../../database/database.js');
module.exports = {
	category: 'moderation',
	data : new SlashCommandBuilder()
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

		const user = interaction.options.getUser('utilisateur');
        if (!user) {
            return interaction.reply({ content: 'Utilisateur introuvable.', ephemeral: true });
        }  


		// Check if the user who about to get warn isn't a staff member
		const isStaff = await staffMembers.findOne({ where: { sm_user_id: user.id } });
		if (isStaff) {
			return interaction.reply({ content: 'Tu ne peux pas warn un membre de la modération.', ephemeral: true });
		}

		await interaction.reply({ content: 'Warn en cours...', ephemeral: true });

		// Capture qui à lancé la commande de warn
		const staff = interaction.member.user;
		const staffId = staff.id;
		const staffName = staff.username;

		// Capture les informations du l'utilisateur warni
		
		const member = await interaction.guild.members.fetch(user.id);

		const raison = interaction.options.getString('raison');

		console.log('User : ' + user.id);
		console.log('Raison : ' + raison);
		console.log('Staff : ' + staffId);

		// Check si le staff executant la commande est un staff
		const staffMember = await staffMembers.findOne({ where: { sm_user_id: staffId } });
		if (!staffMember) {
			return interaction.editReply({ content: 'Tu n\'es pas un staff', ephemeral: true });
		}

		// Check si l'utilisateur à warni est déjà warni
		// Si l'utilisateur n'a jamais été warni on le rajoute à la liste de badUsers
		const warnUser = await badUserModel.findOne({ where: { bu_id: user.id } });
		if (!warnUser) {
			try {
				await badUserModel.create({
					bu_id: user.id,
					bu_name: user.username,
				});
			} catch (SequelizeUniqueConstraintError) {
				console.log('Constrainte de clé unique violée sur la table badUser');
			}
		}

		// Capture la fk de l'utilisateur warni pour lier le warn à l'utilisateur
		const foundBadUser = await badUserModel.findOne({ where: { bu_id: user.id } });
		const fkBadUser = foundBadUser.pk_badUsers;

		// Capture la fk du staff executant la commande pour lier le warn au staff
		const staffMemberId = await staffMembers.findOne({ where: { sm_user_id: staffId } });
		const fkStaffMember = staffMemberId.pk_staffMembers;

		console.log('\n\n--------------- Retrait du warn dans la base de données --------------- \n');

		try {
            const oldestWarn = await warns.findOne({
                where: { wa_fk_badUserId: fkBadUser },
                order: [['createdAt', 'ASC']]
            });

            if (oldestWarn) {
                await oldestWarn.destroy();
                await interaction.editReply({ content: 'Le warn le plus ancien de <@' + user + '> a été retiré !', ephemeral: true });
            } else {
                await interaction.editReply({ content: 'Aucun warn trouvé pour <@' + user + '>', ephemeral: true });
            }
		} catch (error) {
			console.log('\nErreur lors de l\'ajout du warn dans la base de données : \n' + error);
			console.log('voici l\'insertion qui a échoué : \n');
			console.log('raison : ' + raison);
			console.log('date : ' + new Date());
			console.log('badUserId : ' + fkBadUser);
			console.log('staffMemberId : ' + fkStaffMember);

			await interaction.editReply({ content: 'Erreur lors de l\'ajout du warn dans la base de données', ephemeral: true });
		}

		// Si l'utilisateur à déjà été warni 3 fois, on le ban
		const warnCount = await warns.count({ where: { wa_fk_badUserId: fkBadUser } });
		if (warnCount >= 3) {
            await member.ban({ reason: 'A été warn 3 fois' });
            await interaction.editReply({ content: '<@' + user + '> à été banni pour avoir accumulé le nombre max de warn !', ephemeral: true });
        }

		// Envoie d'un embed dans le channel de modération
		try {
			const warnEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('Warn')
				.setDescription('Un utilisateur à été warn')
				.addFields(
					{ name: 'Utilisateur', value: '<@' + user + '>' },
					{ name: 'Raison', value: raison },
					{ name: 'Staff', value: '<@' + staffId + '>' },
				)
				.setTimestamp()
			    // Récuopère l'image de profil de l'utilisateur warni
				.setThumbnail(member.user.displayAvatarURL());
                const channel = interaction.guild.channels.cache.find(channel => channel.name === 'warn-log');
			channel.send({ embeds: [warnEmbed] });
		} catch (error) {
			console.log('Erreur lors de l\'envoie du log' + error);
		}

		// Envoyer un message à l'utilisateur averti
		try {
			await user.send(`Un warn t'a été retiré pour la raison suivante : ${raison}`);
		} catch (error) {
			console.log(`Erreur lors de l'envoi du message à l'utilisateur : ${error}`);
		}
	},
};