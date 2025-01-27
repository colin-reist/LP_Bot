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
        smashOrPass();

        const dailyScheduledMessage = new cron.CronJob('0 11 * * *', () => {
            smashOrPass();
        });

        dailyScheduledMessage.start();

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

    async function smashOrPass() {
        // Remplace avec les IDs des catégories souhaitées
        const categoryIds = ['917158866943377509', '916879499386294292', '917202603195125780', '993871861811269704', '1039226609623912560', '916089088019427358']; 
        const images = [];
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000; // Timestamp pour 7 jours en arrière

        // Parcourt toutes les guilds accessibles au bot
        client.guilds.cache.forEach(async guild => {
            // Récupère tous les salons textuels appartenant aux catégories spécifiées
            const channels = guild.channels.cache.filter(channel =>
                channel.isTextBased() &&
                channel.parentId &&
                categoryIds.includes(channel.parentId)
            );

            if (channels.size === 0) {
                console.log(`Aucun salon trouvé pour les catégories dans la guild : ${guild.name}`);
                return;
            }

            console.log(`Recherche dans ${channels.size} salons de la guild : ${guild.name}`);

            for (const channel of channels.values()) {
                try {
                    const messages = await channel.messages.fetch({ limit: 100 }); // Récupère les 100 derniers messages
                    messages.forEach(message => {
                        if (
                            message.createdTimestamp > sevenDaysAgo && // Vérifie si le message date de moins de 7 jours
                            message.attachments.size > 0 // Vérifie si le message a des fichiers attachés
                        ) {
                            message.attachments.forEach(attachment => {
                                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                                    images.push({
                                        url: attachment.url, // URL de l'image
                                        name: attachment.name, // Nom du fichier
                                        messageUrl: message.url, // URL du message
                                        authorTag: message.author.tag, // Auteur du message
                                        authorId: message.author.id // ID de l'auteur
                                    });
                                }
                            });
                        }
                    });
                } catch (error) {
                    console.error(`Erreur lors de l'accès au salon ${channel.id}:`, error);
                }
            }
        });

        // Attends un moment pour que toutes les promesses soient résolues
        setTimeout(async () => {
            if (images.length === 0) {
                console.log("Aucune image trouvée dans les salons des catégories spécifiées au cours des 7 derniers jours.");
                return;
            }

            // Sélectionne une image au hasard
            const randomImage = images[Math.floor(Math.random() * images.length)];
            console.log(`Image sélectionnée : ${randomImage.url}`);

            // Poste cette image dans un autre salon (par exemple, un salon spécifique)
            const targetChannelId = '1052597309759828098'; // ID du salon où poster l'image
            const targetChannel = client.channels.cache.get(targetChannelId);

            if (targetChannel && targetChannel.isTextBased()) {
                await targetChannel.send(`Nouveau poste ! <@&1163093412812177599>`);
                try {
                    const embed = new EmbedBuilder()
                        .setTitle("✅ Smash or Pass ? ❌")
                        .setDescription(`- Image posté par : **<@${randomImage.authorId}>** \n- Salon d'origine : ${randomImage.messageUrl}`)
                        .setImage(randomImage.url)
                        .setColor("#EBBC4E")
                        .setFooter({
                            text: "Lewd Paradise au service de tout les hornys",
                            iconURL: "https://i.imgur.com/PQtvZLa.gif",
                        });

                    const message = await targetChannel.send({ embeds: [embed] });
                    await message.react('✅');
                    await message.react('❌');
                    console.log("Image postée avec succès !");
                } catch (error) {
                    console.error("Erreur lors de la publication de l'image :", error);
                }
            } else {
                console.log("Le salon cible est introuvable ou non textuel.");
            }
        }, 5000); // Donne du temps aux requêtes asynchrones pour se compléter
    }
}