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
                .setImage("https://i.imgur.com/3fUmg6N.png")
                .setFooter({
                    text: "Lewd Paradise au service de tout les hornys",
                    iconURL: "https://i.imgur.com/PQtvZLa.gif",
                });
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
                    .setTitle('🎉 Annonce du nom du gagnant 🎉')
                    .addFields({
                        name: '🏆 Qui est le gagnant 🏆',
                        value: 'La personne ayant le plus de votes est: \n **<@' + winner.messageAuthorId + '>** ! \n\nFélicitations à lui ! Il gagne avec '
                            + maxReactCount + ' votes et obtient le rôle <@&1052591643544522782> !',
                    })
                    .setImage("https://i.imgur.com/3fUmg6N.png")
                    .setColor("#EBBC4E")
                    .setFooter({
                        text: "Lewd Paradise au service de tout les hornys",
                        iconURL: "https://i.imgur.com/PQtvZLa.gif",
                    });

                channel.send({ embeds: [mondayEmbed] });

                Tags.sync({ Force: true });
            }
            run();
        });

        const sundayScheduledMessage = new cron.CronJob('0 10 * * 0', () => {
            channel.send('<@&1239680929958592524>');
            const sundayEmbed = new EmbedBuilder()
                .setTitle("🌟 Fin des publications 🌟")
                .setDescription("La phase de publication est terminé !")
                .addFields(
                    {
                        name: "🗳️ Phase de votes : Choisissez vos préférés ! 🗳️",
                        value: "- L'émoji de vote et le suivant : <:LP_vote:1001230627242250392>\n- Aucune limite de vote est appliqué (nombre de vote infini)\n- Toute image dépassant 15 votes sera affichés dans <#1153607344505245736>",
                        inline: false
                    },
                    {
                        name: "🏆 Pour le vainquer 🏆",
                        value: "- Le vainqueur est désigné directement par le bot\n- Le gagnant sera récompensé par le rôle <@&1052591643544522782>",
                        inline: false
                    },
                )
                .setImage("https://i.imgur.com/3fUmg6N.png")
                .setColor("#EBBC4E")
                .setFooter({
                    text: "Lewd Paradise au service de tout les hornys",
                    iconURL: "https://i.imgur.com/PQtvZLa.gif",
                })
                .setTimestamp();
        })

        // When you want to start it, use:
        mondayScheduledMessage.start();
        saturdayScheduledMessage.start();
        sundayScheduledMessage.start();

    }
}