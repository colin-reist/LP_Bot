const { Events } = require('discord.js');  // Importer Events et EmbedBuilder
const { EmbedBuilder } = require('discord.js');
const { logger } = require('../../logger.js');

/**
* Capte la modification des rôles d'un membre
* @param {GuildMember} oldMember Le membre avant la modification
* @param {GuildMember} newMember Le membre après la modification
* @returns
*/
module.exports = (client) => {
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (!oldMember.roles.cache.has('965755928974618735') && newMember.roles.cache.has('965755928974618735')) {
            sendBoostBenefitsEmbed(newMember);
        }
    });
};

function sendBoostBenefitsEmbed(member) {
    const channel = member.guild.channels.cache.get('1061643658723590164');
    if (!channel) {
        logger.error(`Le salon boost est introuvable.`);
        return;
    };

    channel.send(`🎉 Merci à <@${member.id}> d'avoir boosté le serveur !\n⬇️⬇️Tu peux regarder tes avangates en dessous !⬇️⬇️`);
    
    const embed = new EmbedBuilder()
        .setTitle('🎉🎉Merci de booster le serveur !🎉🎉')
        .setDescription('Voici les avantages que tu as débloqué en boostant le serveur :')
        .addFields(
            { 
                name: '🔹 Un rôle unique', 
                value: 'Tu as maintenant le droit à ton propre rôle ! \nIl te suffit de donner au staff le nom, la couleur et l\'image que tu veux. \nOuvre un ticket dans <#1251070987194077215> pour en discuter.', 
                inline: false 
            },
            { 
                name: '🔹 Boost d\'expérience (en développement)', 
                value: 'Tu gagnes maintenant 1,1x plus d\'expérience à chaque message envoyé !', 
                inline: false 
            },
            { 
                name: '🔹 Des salons exclusifs',
                value: 'Tu as maintenant accès au salon vocal <#1066497879000227951> pour discuter avec les autres boosters ! \nTu as aussi accès au salon textuel <#1066497794799579136> pour discuter de tout et de rien.', 
                inline: false 
            }
        )
        .setColor('#FF69B4')
        .setTimestamp();

    channel.send({ embeds: [embed] });
};