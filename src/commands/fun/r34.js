const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


module.exports = {
    category: 'fun',
	data: new SlashCommandBuilder()
		.setName('r34')
		.setDescription('Récupère une image de Rule34')
        .addStringOption(option => option.setName('tag').setDescription('Le tag à rechercher').setRequired(true)),
	async execute(interaction) {

        let tag = interaction.options.getString('tag');
        let tagurl = '&tags=';

        if (!tag) {
            tagurl += ' -feral -scat -gore -ai_generated';
        } else {
            tagurl += tag + ' -feral -scat -gore -ai_generated';
        }
        
        const limit = 900;
        let limitUrl = '&limit=' + limit;
        
        const json = '&json=1';
        
        let baseUrl = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index'        
        
        let url = baseUrl + json + limitUrl + tagurl;
        
        let data = {};
        try {
            let response = await fetch(url);
            data = await response.json();
        } catch (error) {
            return interaction.reply({ content: `Tag inconnu`, ephemeral: true });
        }

        let random = Math.floor(Math.random() * data.length);
        
        let embed = {
            color: 0x00ff00,
            title: 'Rule34',
            url: 'https://rule34.xxx/',
            description: 'Récupère une image de Rule34',
            thumbnail: {
                url: 'https://rule34.xxx/favicon.ico',
            },
            fields: [
                {
                    name: 'Tag(s) saisi(s)',
                    value: tag,
                },
            ],
            image: {
                url: data[random].file_url,
            },
            footer: {
                text: 'Lewd Paradise',
                icon_url: interaction.guild.iconURL(),
            },
            
        };

        // Si l'image récupérée est une vidéo, on l'envoie séparément
        if (data[random].file_url.includes('.mp4')) {
            await interaction.reply({ content: `>>> **[Rule34](https://rule34.xxx/)** \n**Tag(s) saisi(s)** \n${tag} \n[Lien vers la vidéo](${data[random].file_url})` });
        } else {
            await interaction.reply({ embeds: [embed] });
        }
	},
};
