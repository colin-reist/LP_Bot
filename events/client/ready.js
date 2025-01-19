const { Events, ActivityType, EmbedBuilder } = require('discord.js'); // Importer Events
const cron = require('cron'); // Importer cron
const logger = require('../../logger'); // Importer logger

module.exports = (client) => {
    /**
     * Tableau des status du bot
     */
    const status = [
        {
            type: ActivityType.Playing,
            name: 'Compte le nombre de votes',
        },
        {
            type: ActivityType.Watching,
            name: 'qui est qualifié',
        },
        {
            name: '.gg/lewd.paradise',
            type: ActivityType.Playing,
            url: 'https://discord.gg/lewd.paradise',
        },
    ];

    client.once(Events.ClientReady, () => {

        setInterval(() => {
            const index = Math.floor(Math.random() * (status.length - 1) + 1);
            client.user.setActivity(status[index].name, { type: status[index].type });
        }, 600000);

        concours();

        logger.info('Status : Bot is started');
    });

    /**
 * Fonction qui gère le concours
 * @returns
 */
    async function concours() {

        const channel = client.channels.cache.get('1277507675915157524');

        const saturdayScheduledMessage = new cron.CronJob('0 10 * * 6', () => {
            channel.send('<@&1239680929958592524>');
            const mondayEmbed = new EmbedBuilder()
                .setColor('#EBBC4E')
                .setTitle('❗ Dernier jour pour poster ❗')
                .addFields({
                    name: '🕰️ 24h pour participer 🕰️',
                    value: 'Il vous reste un peu moins de 24h pour poster vos images et tenter de gagner le concours de la semaine !',
                })
                .setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')

                .setFooter({ text: 'Lewd Paradise au service de tout les horny' });
            channel.send({ embeds: [mondayEmbed] });
        });

        const mondayScheduledMessage = new cron.CronJob('0 10 * * 1', () => {
            channel.send('<@&1239680929958592524>');
            let maxReactCount = 0;
            let winner = 0;
            async function run() {

                // Get all tags from the database
                const allTags = await Tags.findAll();

                // Find the max react count among all tags
                maxReactCount = Math.max(...allTags.map(tag => tag.reactCount));

                winner = await Tags.findOne({ where: { reactCount: maxReactCount } });

                console.log(winner.messageID);

                const mondayEmbed = new EmbedBuilder()
                    .setColor('#EBBC4E')
                    .setTitle('🎉 Annonce du nom du gagnant 🎉')
                    .addFields({
                        name: '🏆 Qui est le gagnant 🏆',
                        value: 'La personne ayant le plus de votes est: \n **<@' + winner.messageAuthorId + '>** ! \n\nFélicitations à lui ! Il gagne avec '
                            + maxReactCount + ' votes et obtient le rôle <@&1052591643544522782> !',
                    })
                    .setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')
                    .setFooter({ text: 'Lewd Paradise au service de tout les horny' });

                channel.send({ embeds: [mondayEmbed] });

                Tags.sync({ Force: true });
            }
            run();
        });

        const sundayScheduledMessage = new cron.CronJob('0 10 * * 0', () => {
            channel.send('<@&1239680929958592524>');
            const sundayEmbed = new EmbedBuilder()
                .setColor('#EBBC4E')
                .setTitle('🌟 Fin des publications 🌟')
                .addFields({
                    name: '🗳️ Phase de votes 🗳️',
                    value: 'Vous pouvez maintenant voter pour vos images préférées ! \nles personnes ayant plus de 15 votes seront affiché dans: \n* <#1153607344505245736>'
                        + '\nPour voter, il vous suffit de réagir avec <:LP_vote:1001230627242250392> sur les images que vous aimez !'
                        + '\nVous pouvez voter pour autant d\'images que vous le souhaitez !',
                })
                .addFields({
                    name: '🏆 Pour le vainquer 🏆',
                    value: 'Le vainqueur sera auto désigné par le bot ! \nIl sera celui qui aura le plus de votes !'
                        + '\nLe gagnant recevra le rôle <@&1153607344505245736> et sera affiché dans: \n* <#1165043827430670416> !',
                })
                .setImage('https://images2.imgbox.com/c7/b8/dtsE4Xp8_o.png')
                .setFooter({ text: 'Lewd Paradise au service de tout les horny' });

            channel.send({ embeds: [sundayEmbed] });
        });

        // When you want to start it, use:
        mondayScheduledMessage.start();
        saturdayScheduledMessage.start();
        sundayScheduledMessage.start();

    }
}