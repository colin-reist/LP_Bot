# LP_Bot

Bot Discord pour Lewd Paradise avec commandes slash, gestion des niveaux et tâches planifiées.

## Prérequis
- Node.js 21.6.2 (ou version compatible) et npm.
- Un compte développeur Discord, une application/bot avec les intents privilégiés activés (Message Content, Server Members, Presence).
- Un accès à une base MySQL

## Installation
1) Cloner le dépôt puis entrer dans le dossier :  
   `git clone <url-du-repo> && cd LP_Bot`
2) Installer les dépendances :  
   `npm install`

## Configuration
Crée `config/config.json` (le fichier n’est pas versionné) avec tes identifiants Discord et SQL :
```json
{
  "token": "TON_TOKEN_BOT_DISCORD",
  "clientId": "ID_APPLICATION_DISCORD",
  "guildId": "ID_DU_SERVEUR_POUR_LES_COMMANDES",
  "database": "NOM_DE_BASE",
  "user": "UTILISATEUR_SQL",
  "password": "MOT_DE_PASSE_SQL",
  "loggerLevel": "debug"
}
```
- `token` : token du bot.  
- `clientId` : Application ID (aussi appelé Client ID).  
- `guildId` : serveur où déployer les commandes slash.  
- `database`, `user`, `password` : accès MySQL utilisé par Sequelize.  
- `loggerLevel` : niveau de logs (`debug`, `info`, etc.).

À la première exécution, un fichier `scripts/commands.json` est généré pour versionner les commandes slash.

## Lancer le bot
```bash
npm start
```
Le démarrage enregistre automatiquement les commandes slash (`scripts/deploy-commands.js`), synchronise les modèles Sequelize et connecte le bot à Discord avec le token fourni.
