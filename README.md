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

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet (un template `.env.example` est fourni) :

```env
# Discord Configuration
DISCORD_TOKEN=votre_token_bot_discord
DISCORD_CLIENT_ID=votre_client_id
DISCORD_GUILD_ID=votre_guild_id

# Database Configuration
DB_HOST=votre_host_mysql
DB_NAME=votre_base_de_donnees
DB_USER=votre_utilisateur_sql
DB_PASSWORD=votre_mot_de_passe_sql
DB_DIALECT=mysql

# Logging Configuration
LOG_LEVEL=debug

# Environment
NODE_ENV=production
```

**Variables importantes:**
- `DISCORD_TOKEN` : Token du bot Discord
- `DISCORD_CLIENT_ID` : Application ID (Client ID) de votre bot
- `DISCORD_GUILD_ID` : ID du serveur pour déployer les commandes slash
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` : Accès MySQL utilisé par Sequelize
- `LOG_LEVEL` : Niveau de logs (`debug`, `info`, `warn`, `error`)

⚠️ **Sécurité:** Le fichier `.env` contient des secrets et ne doit JAMAIS être commité sur Git. Il est déjà listé dans `.gitignore`.

À la première exécution, un fichier `scripts/commands.json` est généré pour versionner les commandes slash.

## Lancer le bot
```bash
npm start
```
Le démarrage enregistre automatiquement les commandes slash (`scripts/deploy-commands.js`), synchronise les modèles Sequelize et connecte le bot à Discord avec le token fourni.
