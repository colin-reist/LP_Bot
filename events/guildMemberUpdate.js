function boost(newMember) {
    const embed = new EmbedBuilder()
				.setTitle(`${newMember.user.tag} a donné un boost au seveur !`)
				.setDescription(`Merci, ${newMember.user.tag}, pour booster le serveur ${userBoost.boostCount} fois ! Nous te sommes reconnaissants pour tes nombreux boosts.`)
				.addFields(
					{
					  name: "Récompense",
					  value: `Tu peux voir tes récompenses dans <#>, tu peux les réclamer dans <#> et ping <@551091502860730368>`,
					  inline: false
					},
				  )
				.setColor('#EBBC4E');

	const channel = guild.channels.cache.get('1061643658723590164');
    channel.send('<@' + newMember.user.id + '> Merci d\'avoir boosté le serveur lis l\'embed juste en dessous');
    channel.send(embed);
}

module.exports = { boost };