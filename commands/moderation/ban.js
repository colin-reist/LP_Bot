const { SlashCommandBuilder } = require('discord.js');
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

		// Envoie un message d'avertissement à l'utilisateur
		await member.send('## Tu as été ban sur Lewd Paradise pour la raison suivante : \n' + raison);

		// Ban l'utilisateur
		await member.ban();
	},
};