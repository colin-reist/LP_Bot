# Plan d'Action - Implémentation des Recommandations d'Audit

**Date de création:** 2026-01-15
**Projet:** LP_Bot
**Priorité:** Résolution des problèmes critiques de sécurité et qualité

---

## 🎯 Vue d'Ensemble

Ce document fournit un plan d'action détaillé, étape par étape, pour implémenter les recommandations de l'audit. Les tâches sont organisées par sprint avec des estimations de temps.

---

## 📅 SPRINT 1 - SÉCURITÉ CRITIQUE (2-3 jours)

### Objectif
Éliminer tous les risques de sécurité critiques et élever le niveau de sécurité de 4/10 à 7/10.

### Tâches

#### ✅ Tâche 1.1: Migration vers Variables d'Environnement
**Temps estimé:** 1h
**Priorité:** 🔴 CRITIQUE

**Étapes:**

1. Créer le fichier `.env` à la racine:
```bash
touch .env
```

2. Ajouter le contenu (remplacer par vraies valeurs):
```env
# Discord
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here

# Database
DB_HOST=eu02-sql.pebblehost.com
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_DIALECT=mysql

# Logging
LOG_LEVEL=debug

# Environment
NODE_ENV=production
```

3. Vérifier que `.env` est dans `.gitignore`:
```bash
echo ".env" >> .gitignore
```

4. Modifier `src/index.js`:
```javascript
require('dotenv').config();

// Remplacer:
// const { token } = require('../config/config.json');
// Par:
const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('DISCORD_TOKEN manquant dans .env');
    process.exit(1);
}
```

5. Modifier `database/database.js`:
```javascript
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);
```

6. Créer `.env.example` pour la documentation:
```bash
cp .env .env.example
# Remplacer les valeurs sensibles par des placeholders
```

7. **⚠️ IMPORTANT:** Régénérer le token Discord sur le Developer Portal

**Validation:**
```bash
npm start
# Vérifier que le bot démarre sans erreur
```

---

#### ✅ Tâche 1.2: Sécurisation Commande r34
**Temps estimé:** 2h
**Priorité:** 🔴 CRITIQUE

**Fichier:** `src/commands/fun/r34.js`

**Modifications:**

```javascript
const { SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const logger = require('#logger');

// Configuration
const API_BASE_URL = 'https://api.rule34.xxx/index.php?page=dapi&s=post&q=index';
const API_TIMEOUT = 5000;
const MAX_TAG_LENGTH = 100;
const MAX_RESULTS = 900;
const BLACKLISTED_TAGS = ['-feral', '-scat', '-gore', '-ai_generated'];

module.exports = {
    category: 'fun',
    cooldown: 5, // Augmenter le cooldown
    data: new SlashCommandBuilder()
        .setName('r34')
        .setDescription('Récupère une image de Rule34')
        .addStringOption(option =>
            option.setName('tag')
                .setDescription('Le tag à rechercher')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // 1. Validation et sanitization du tag
            let tag = interaction.options.getString('tag')
                .trim()
                .toLowerCase()
                .substring(0, MAX_TAG_LENGTH)
                .replace(/[^a-z0-9_\-\s]/gi, ''); // Supprime caractères dangereux

            if (!tag || tag.length < 2) {
                return interaction.editReply({
                    content: '❌ Le tag doit contenir au moins 2 caractères valides.',
                    ephemeral: true
                });
            }

            // 2. Construction de l'URL
            const tagUrl = `&tags=${encodeURIComponent(tag)} ${BLACKLISTED_TAGS.join(' ')}`;
            const url = `${API_BASE_URL}&json=1&limit=${MAX_RESULTS}${tagUrl}`;

            logger.debug(`R34 API call: ${url}`);

            // 3. Fetch avec timeout et abort controller
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

            let response;
            try {
                response = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'LP_Bot/1.0' }
                });
            } finally {
                clearTimeout(timeout);
            }

            // 4. Vérification du statut HTTP
            if (!response.ok) {
                logger.warn(`R34 API error: ${response.status} ${response.statusText}`);
                return interaction.editReply({
                    content: '❌ L\'API Rule34 est temporairement indisponible.',
                    ephemeral: true
                });
            }

            // 5. Parse JSON
            const data = await response.json();

            // 6. Vérification des résultats
            if (!Array.isArray(data) || data.length === 0) {
                return interaction.editReply({
                    content: `❌ Aucun résultat trouvé pour le tag: \`${tag}\``,
                    ephemeral: true
                });
            }

            // 7. Sélection aléatoire
            const randomIndex = Math.floor(Math.random() * data.length);
            const result = data[randomIndex];

            // 8. Validation du résultat
            if (!result.file_url || typeof result.file_url !== 'string') {
                logger.error('R34 API returned invalid data structure');
                return interaction.editReply({
                    content: '❌ Format de réponse invalide de l\'API.',
                    ephemeral: true
                });
            }

            // 9. Construction de la réponse
            if (result.file_url.includes('.mp4') || result.file_url.includes('.webm')) {
                // Vidéo
                await interaction.editReply({
                    content: `>>> **[Rule34](https://rule34.xxx/)** \n**Tag(s):** ${tag}\n[Lien vers la vidéo](${result.file_url})`
                });
            } else {
                // Image
                const embed = {
                    color: 0x00ff00,
                    title: 'Rule34',
                    url: 'https://rule34.xxx/',
                    description: 'Résultat de recherche Rule34',
                    thumbnail: {
                        url: 'https://rule34.xxx/favicon.ico',
                    },
                    fields: [
                        {
                            name: 'Tag(s) recherché(s)',
                            value: tag,
                        },
                    ],
                    image: {
                        url: result.file_url,
                    },
                    footer: {
                        text: 'Lewd Paradise',
                        icon_url: interaction.guild.iconURL(),
                    },
                };

                await interaction.editReply({ embeds: [embed] });
            }

            logger.debug(`R34 command success for tag: ${tag}`);

        } catch (error) {
            // 10. Gestion d'erreurs détaillée
            if (error.name === 'AbortError') {
                logger.warn('R34 API timeout');
                return interaction.editReply({
                    content: '❌ L\'API a mis trop de temps à répondre. Réessayez.',
                    ephemeral: true
                });
            }

            logger.error('R34 command error:', error);
            return interaction.editReply({
                content: '❌ Une erreur est survenue lors de la recherche.',
                ephemeral: true
            });
        }
    },
};
```

**Validation:**
```bash
# Test 1: Tag valide
/r34 tag:cat

# Test 2: Tag avec caractères spéciaux
/r34 tag:test<script>

# Test 3: Tag vide
/r34 tag:

# Test 4: Tag très long
/r34 tag:aaaa... (>100 caractères)
```

---

#### ✅ Tâche 1.3: Rate Limiting XP
**Temps estimé:** 1h30
**Priorité:** 🔴 CRITIQUE

**Fichier:** `src/events/message/create.js`

**Modifications:**

```javascript
// Ajouter en haut du fichier
const userXpCooldowns = new Map();
const XP_COOLDOWN = 60000; // 1 minute

// Modifier la fonction levelHandler
async function levelHandler(message) {
    try {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Rate limiting par utilisateur
        const now = Date.now();
        const cooldownKey = message.author.id;

        if (userXpCooldowns.has(cooldownKey)) {
            const expirationTime = userXpCooldowns.get(cooldownKey) + XP_COOLDOWN;
            if (now < expirationTime) {
                logger.debug(`User ${message.author.username} in XP cooldown`);
                return;
            }
        }

        // Mise à jour du cooldown
        userXpCooldowns.set(cooldownKey, now);

        // Nettoyage périodique du Map (éviter memory leak)
        if (userXpCooldowns.size > 10000) {
            const oldestAllowed = now - XP_COOLDOWN;
            for (const [key, timestamp] of userXpCooldowns.entries()) {
                if (timestamp < oldestAllowed) {
                    userXpCooldowns.delete(key);
                }
            }
        }

        // Reste de la logique existante...
        const user = await Users.findOne({ where: { discord_identifier: message.author.id } });

        if (user) {
            // ... (code existant)
        } else {
            await Users.create({
                discord_identifier: message.author.id,
                username: message.author.username,
                experience: 1,
            });
        }
    } catch (error) {
        logger.error('Erreur lors de l\'incrémentation de l\'expérience :\n', error);
    }
}
```

**Validation:**
- Envoyer plusieurs messages rapidement → seul le premier donne XP
- Attendre 1 minute → message suivant donne XP

---

#### ✅ Tâche 1.4: Amélioration Permissions
**Temps estimé:** 2h
**Priorité:** 🟠 HAUTE

**Fichiers à modifier:** Toutes les commandes de modération

**Exemple avec `warn.js`:**

```javascript
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn un utilisateur du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // AJOUT
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à warnir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison du warn')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Double vérification des permissions
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.editReply({
                    content: '❌ Vous n\'avez pas la permission `Modérer les membres`.',
                    ephemeral: true
                });
            }

            // Vérification Staff (optionnel, en plus de Discord permissions)
            if (!hasStaffRole(interaction)) {
                return interaction.editReply({
                    content: '❌ Vous devez avoir le rôle Staff.',
                    ephemeral: true
                });
            }

            // Reste de la logique...
        } catch (error) {
            logger.error('Erreur warn:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    },
};
```

**Appliquer à:**
- `ban.js` → `PermissionFlagsBits.BanMembers`
- `kick.js` → `PermissionFlagsBits.KickMembers`
- `hackban.js` → `PermissionFlagsBits.BanMembers`
- `warnremove.js` → `PermissionFlagsBits.ModerateMembers`
- `changeallname.js` → `PermissionFlagsBits.ManageNicknames`
- `resetname.js` → `PermissionFlagsBits.ManageNicknames`

---

#### ✅ Tâche 1.5: Nettoyer package.json
**Temps estimé:** 30min
**Priorité:** 🟡 MOYENNE

**Commandes:**

```bash
# Supprimer dépendances inutiles
npm uninstall child_process logger node node.js mysql

# Mettre à jour les dépendances
npm update

# Corriger les vulnérabilités
npm audit fix

# Vérifier l'état
npm audit
```

**Ajouter scripts utiles dans `package.json`:**
```json
{
    "scripts": {
        "start": "node src/index.js",
        "dev": "nodemon src/index.js",
        "lint": "eslint src/**/*.js",
        "lint:fix": "eslint src/**/*.js --fix",
        "audit": "npm audit",
        "deploy-commands": "node scripts/deploy-commands.js"
    }
}
```

---

### ✅ Sprint 1 - Checklist Finale

- [ ] `.env` créé avec toutes les variables
- [ ] `dotenv` installé: `npm install dotenv`
- [ ] Code modifié pour utiliser `process.env`
- [ ] Token Discord régénéré
- [ ] Commande r34 sécurisée
- [ ] Rate limiting XP implémenté
- [ ] Permissions Discord sur commandes modération
- [ ] package.json nettoyé
- [ ] `npm audit` sans critical/high
- [ ] Bot testé et fonctionnel

**Résultat attendu:** Sécurité 4/10 → 7/10

---

## 📅 SPRINT 2 - TESTS ET QUALITÉ (3-4 jours)

### Objectif
Atteindre 50% de couverture de tests et améliorer la qualité du code.

### Tâches

#### ✅ Tâche 2.1: Setup Jest
**Temps estimé:** 1h

```bash
npm install --save-dev jest @types/jest

# package.json
{
    "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
    },
    "jest": {
        "testEnvironment": "node",
        "coverageDirectory": "coverage",
        "collectCoverageFrom": [
            "src/**/*.js",
            "!src/index.js",
            "!**/node_modules/**"
        ],
        "coverageThreshold": {
            "global": {
                "branches": 50,
                "functions": 50,
                "lines": 50,
                "statements": 50
            }
        }
    }
}
```

---

#### ✅ Tâche 2.2: Tests Utilitaires
**Temps estimé:** 2h

**Créer:** `__tests__/utils/permissionUtils.test.js`

```javascript
const { hasStaffRole } = require('../../src/utils/permissionUtils');

describe('permissionUtils', () => {
    describe('hasStaffRole', () => {
        it('should return true when member has Staff role by name', () => {
            const mockContext = {
                member: {
                    roles: {
                        cache: [
                            { name: 'Staff', id: '123' }
                        ]
                    }
                }
            };
            mockContext.member.roles.cache.some = (fn) => fn({ name: 'Staff' });

            expect(hasStaffRole(mockContext)).toBe(true);
        });

        it('should return false when member has no Staff role', () => {
            const mockContext = {
                member: {
                    roles: {
                        cache: []
                    }
                }
            };
            mockContext.member.roles.cache.some = () => false;

            expect(hasStaffRole(mockContext)).toBe(false);
        });

        it('should return false when member is null', () => {
            const mockContext = { member: null };
            expect(hasStaffRole(mockContext)).toBe(false);
        });
    });
});
```

**Créer:** `__tests__/events/levelHandler.test.js`

```javascript
describe('Level System', () => {
    describe('getLevelFromXP', () => {
        // Extraire la fonction dans un module testable
        const { getLevelFromXP } = require('../../src/utils/levelUtils');

        it('should return level 0 for 0 XP', () => {
            expect(getLevelFromXP(0)).toBe(0);
        });

        it('should return level 1 for 150 XP', () => {
            expect(getLevelFromXP(150)).toBe(1);
        });

        it('should return level 2 for 450 XP', () => {
            expect(getLevelFromXP(450)).toBe(2);
        });

        it('should return level 10 for high XP', () => {
            // Calculer XP nécessaire pour niveau 10
            const xp = 5000;
            expect(getLevelFromXP(xp)).toBeGreaterThanOrEqual(10);
        });
    });
});
```

**Refactoring requis:** Extraire `getLevelFromXP` dans `src/utils/levelUtils.js`

---

#### ✅ Tâche 2.3: Tests d'Intégration DB
**Temps estimé:** 3h

**Créer:** `__tests__/database/userCRUD.test.js`

```javascript
const { Sequelize } = require('sequelize');
const { Users } = require('../../database/database');

describe('Users Model', () => {
    let sequelize;

    beforeAll(async () => {
        // Base de données SQLite en mémoire pour les tests
        sequelize = new Sequelize('sqlite::memory:', { logging: false });

        // Définir le modèle (ou importer depuis database.js modifié)
        // ...

        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    afterEach(async () => {
        await Users.destroy({ where: {}, truncate: true });
    });

    it('should create a new user', async () => {
        const user = await Users.create({
            discord_identifier: 123456789,
            username: 'TestUser',
            experience: 0
        });

        expect(user.username).toBe('TestUser');
        expect(user.experience).toBe(0);
    });

    it('should increment user experience', async () => {
        const user = await Users.create({
            discord_identifier: 123456789,
            username: 'TestUser',
            experience: 100
        });

        await user.increment('experience', { by: 50 });
        await user.reload();

        expect(user.experience).toBe(150);
    });

    it('should enforce unique discord_identifier', async () => {
        await Users.create({
            discord_identifier: 123456789,
            username: 'User1',
            experience: 0
        });

        await expect(
            Users.create({
                discord_identifier: 123456789,
                username: 'User2',
                experience: 0
            })
        ).rejects.toThrow();
    });
});
```

---

#### ✅ Tâche 2.4: Refactoring Code
**Temps estimé:** 4h

**Créer Services:**

`src/services/UserService.js`:
```javascript
const { Users } = require('#database');
const logger = require('#logger');

class UserService {
    async getOrCreate(discordId, username) {
        try {
            let user = await Users.findOne({
                where: { discord_identifier: discordId }
            });

            if (!user) {
                user = await Users.create({
                    discord_identifier: discordId,
                    username: username,
                    experience: 0
                });
                logger.debug(`User created: ${username} (${discordId})`);
            }

            return user;
        } catch (error) {
            logger.error('Error in getOrCreate:', error);
            throw error;
        }
    }

    async addExperience(discordId, amount) {
        const user = await Users.findOne({
            where: { discord_identifier: discordId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        await user.increment('experience', { by: amount });
        return user.reload();
    }

    async getUserLevel(discordId) {
        const user = await Users.findOne({
            where: { discord_identifier: discordId }
        });

        if (!user) return { level: 0, xp: 0 };

        const level = this.calculateLevel(user.experience);
        return { level, xp: user.experience };
    }

    calculateLevel(xp) {
        let level = 0;
        let remainingXp = xp;

        while (true) {
            const requiredXP = 50 * level ** 2 + 50 * level + 100;
            if (remainingXp < requiredXP) break;
            remainingXp -= requiredXP;
            level++;
        }

        return level;
    }
}

module.exports = new UserService();
```

**Modifier les commandes pour utiliser le service:**

```javascript
// Dans rank.js, warn.js, etc.
const UserService = require('../../services/UserService');

// Au lieu de:
const user = await ensureUserExists(userId, username);

// Utiliser:
const user = await UserService.getOrCreate(userId, username);
```

---

### ✅ Sprint 2 - Checklist Finale

- [ ] Jest installé et configuré
- [ ] Tests utils/ à 80%+ coverage
- [ ] Tests database/ à 60%+ coverage
- [ ] UserService créé et testé
- [ ] Code refactoré pour utiliser services
- [ ] Coverage globale ≥ 50%
- [ ] Tous les tests passent: `npm test`

**Résultat attendu:** Tests 0/10 → 6/10, Qualité 6/10 → 8/10

---

## 📅 SPRINT 3 - PERFORMANCE & MONITORING (2-3 jours)

### Objectif
Améliorer les performances et ajouter du monitoring.

### Tâches

#### ✅ Tâche 3.1: Cache Utilisateurs
**Temps estimé:** 2h

**Créer:** `src/utils/cache.js`

```javascript
class Cache {
    constructor(ttl = 300000) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Cleanup si trop gros
        if (this.cache.size > 10000) {
            this.cleanup();
        }
    }

    get(key) {
        const item = this.cache.get(key);

        if (!item) return null;

        // Vérifier TTL
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.ttl) {
                this.cache.delete(key);
            }
        }
    }

    clear() {
        this.cache.clear();
    }
}

module.exports = Cache;
```

**Utiliser dans UserService:**

```javascript
const Cache = require('../utils/cache');
const userCache = new Cache(300000); // 5 minutes

async getOrCreate(discordId, username) {
    // Vérifier cache
    const cached = userCache.get(discordId);
    if (cached) return cached;

    // Requête DB
    let user = await Users.findOne({
        where: { discord_identifier: discordId }
    });

    if (!user) {
        user = await Users.create({
            discord_identifier: discordId,
            username: username,
            experience: 0
        });
    }

    // Mettre en cache
    userCache.set(discordId, user);
    return user;
}

// Invalider cache lors de mise à jour
async addExperience(discordId, amount) {
    const user = await Users.findOne({
        where: { discord_identifier: discordId }
    });

    if (!user) throw new Error('User not found');

    await user.increment('experience', { by: amount });
    const updatedUser = await user.reload();

    // Invalider/mettre à jour le cache
    userCache.set(discordId, updatedUser);

    return updatedUser;
}
```

---

#### ✅ Tâche 3.2: Index Base de Données
**Temps estimé:** 1h

**Fichier:** `database/database.js`

```javascript
// Après la définition des modèles

// Index pour requêtes fréquentes
Punishments.addIndex(['fk_user', 'type', 'createdAt'], {
    name: 'punishments_user_type_date_idx'
});

Punishments.addIndex(['type', 'expires_at'], {
    name: 'punishments_type_expiry_idx'
});

Suggestions.addIndex(['status', 'date'], {
    name: 'suggestions_status_date_idx'
});

Concours.addIndex(['fk_user', 'count'], {
    name: 'concours_user_count_idx'
});

logger.info('Database indexes created');
```

---

#### ✅ Tâche 3.3: Monitoring avec Sentry
**Temps estimé:** 1h30

```bash
npm install @sentry/node
```

**Fichier:** `src/monitoring.js`

```javascript
const Sentry = require('@sentry/node');
const logger = require('#logger');

function initMonitoring() {
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: 1.0,
        });

        logger.info('Sentry monitoring initialized');
    } else {
        logger.warn('SENTRY_DSN not set, monitoring disabled');
    }
}

function captureError(error, context = {}) {
    logger.error('Error captured:', error);

    if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context
        });
    }
}

module.exports = { initMonitoring, captureError };
```

**Modifier `src/index.js`:**

```javascript
const { initMonitoring, captureError } = require('./monitoring');

// Au début
initMonitoring();

// Dans les try/catch
} catch (error) {
    logger.error('Error loading command:', error);
    captureError(error, { command: file });
}
```

---

#### ✅ Tâche 3.4: Métriques Custom
**Temps estimé:** 2h

**Créer:** `src/utils/metrics.js`

```javascript
const logger = require('#logger');

class Metrics {
    constructor() {
        this.counters = new Map();
        this.gauges = new Map();
        this.timers = new Map();
    }

    increment(metric, value = 1) {
        const current = this.counters.get(metric) || 0;
        this.counters.set(metric, current + value);
    }

    gauge(metric, value) {
        this.gauges.set(metric, value);
    }

    startTimer(metric) {
        this.timers.set(metric, Date.now());
    }

    endTimer(metric) {
        const start = this.timers.get(metric);
        if (!start) return;

        const duration = Date.now() - start;
        this.timers.delete(metric);

        logger.debug(`Metric ${metric}: ${duration}ms`);
        return duration;
    }

    logMetrics() {
        logger.info('=== Metrics Report ===');
        logger.info('Counters:', Object.fromEntries(this.counters));
        logger.info('Gauges:', Object.fromEntries(this.gauges));
    }

    reset() {
        this.counters.clear();
        this.gauges.clear();
        this.timers.clear();
    }
}

module.exports = new Metrics();
```

**Utiliser dans les commandes:**

```javascript
const metrics = require('../../utils/metrics');

async execute(interaction) {
    metrics.increment('commands.warn.total');
    metrics.startTimer('commands.warn.duration');

    try {
        // ... logique commande ...

        metrics.increment('commands.warn.success');
    } catch (error) {
        metrics.increment('commands.warn.errors');
        throw error;
    } finally {
        metrics.endTimer('commands.warn.duration');
    }
}
```

**Log périodique des métriques:**

```javascript
// src/index.js
const metrics = require('./utils/metrics');

// Log metrics toutes les heures
setInterval(() => {
    metrics.logMetrics();
}, 3600000);
```

---

### ✅ Sprint 3 - Checklist Finale

- [ ] Cache utilisateurs implémenté
- [ ] Index DB créés
- [ ] Sentry configuré (optionnel si DSN fourni)
- [ ] Métriques custom implémentées
- [ ] Logging périodique des métriques
- [ ] Tests de performance effectués

**Résultat attendu:** Performance 6/10 → 8/10

---

## 📅 SPRINT 4 - DOCUMENTATION (1-2 jours)

### Objectif
Documenter le projet pour faciliter maintenance et contributions.

### Tâches

#### ✅ Tâche 4.1: Documentation Commandes
**Temps estimé:** 2h

**Créer:** `docs/COMMANDS.md`

```markdown
# Commandes LP_Bot

## Modération

### /warn
**Description:** Avertit un utilisateur. Après 3 warns en 3 mois, ban automatique.
**Permissions:** Modérer les membres, rôle Staff
**Paramètres:**
- `utilisateur` (requis): L'utilisateur à avertir
- `raison` (requis): Raison de l'avertissement

**Exemples:**
```
/warn @User spam dans #general
/warn @User langage inapproprié
```

### /ban
**Description:** Bannit un utilisateur du serveur
**Permissions:** Bannir les membres, rôle Staff
**Paramètres:**
- `utilisateur` (requis): L'utilisateur à bannir
- `raison` (requis): Raison du bannissement
- `duree` (optionnel): Durée en jours (0 = permanent)

**Exemples:**
```
/ban @User raid
/ban @User harcèlement duree:7
```

[... continuer pour toutes les commandes ...]
```

---

#### ✅ Tâche 4.2: Guide Contribution
**Temps estimé:** 1h

**Créer:** `CONTRIBUTING.md`

```markdown
# Guide de Contribution

## Ajouter une Nouvelle Commande

1. Créer le fichier dans `src/commands/[categorie]/[nom].js`
2. Structure requise:

\`\`\`javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    category: 'categorie',
    cooldown: 3, // secondes
    data: new SlashCommandBuilder()
        .setName('nom')
        .setDescription('Description'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Logique de la commande

            await interaction.editReply({ content: 'Succès' });
        } catch (error) {
            logger.error('Error in [nom]:', error);
            await interaction.editReply({
                content: 'Erreur',
                ephemeral: true
            });
        }
    },
};
\`\`\`

3. Tester localement
4. Écrire les tests dans `__tests__/commands/[categorie]/[nom].test.js`
5. Créer une PR

[... plus de détails ...]
```

---

#### ✅ Tâche 4.3: Améliorer README
**Temps estimé:** 1h

Ajouter au README:
- Badge build status (GitHub Actions)
- Badge coverage
- Table des matières
- Captures d'écran
- Section FAQ
- Liens vers docs complète

---

### ✅ Sprint 4 - Checklist Finale

- [ ] COMMANDS.md créé avec toutes les commandes
- [ ] CONTRIBUTING.md créé
- [ ] README amélioré
- [ ] Commentaires JSDoc sur fonctions publiques
- [ ] docs/ directory créé

**Résultat attendu:** Documentation 5/10 → 8/10

---

## 🎯 Résumé des Résultats Attendus

| Sprint | Durée | Catégories Améliorées | Avant → Après |
|--------|-------|----------------------|---------------|
| Sprint 1 | 2-3j | Sécurité, Dépendances | 4/10 → 7/10, 6/10 → 8/10 |
| Sprint 2 | 3-4j | Tests, Qualité | 0/10 → 6/10, 6/10 → 8/10 |
| Sprint 3 | 2-3j | Performance | 6/10 → 8/10 |
| Sprint 4 | 1-2j | Documentation | 5/10 → 8/10 |

**Total:** 8-12 jours de développement

**Résultat Global:**
- Note moyenne avant: 4.6/10
- Note moyenne après: 7.5/10
- **Amélioration: +63%**

---

## 📋 Checklist Générale

### Setup Initial
- [ ] Créer branche `feature/security-improvements`
- [ ] Backup de la base de données
- [ ] Environnement de test configuré

### Sprint 1 (Sécurité)
- [ ] Variables d'environnement
- [ ] Sécurisation r34.js
- [ ] Rate limiting XP
- [ ] Permissions Discord
- [ ] Nettoyage dépendances

### Sprint 2 (Tests)
- [ ] Jest configuré
- [ ] Tests unitaires ≥ 50 coverage
- [ ] Tests intégration DB
- [ ] Services créés
- [ ] Code refactoré

### Sprint 3 (Performance)
- [ ] Cache utilisateurs
- [ ] Index DB
- [ ] Monitoring (Sentry)
- [ ] Métriques custom

### Sprint 4 (Documentation)
- [ ] COMMANDS.md
- [ ] CONTRIBUTING.md
- [ ] README amélioré
- [ ] JSDoc ajouté

### Finalisation
- [ ] Tous les tests passent
- [ ] `npm audit` clean
- [ ] ESLint clean
- [ ] PR créée avec description détaillée
- [ ] Review par l'équipe
- [ ] Merge vers main

---

## 🚀 Commandes Rapides

```bash
# Sprint 1
npm install dotenv
# Éditer .env, index.js, database.js
npm uninstall child_process logger node node.js mysql
npm audit fix
npm start

# Sprint 2
npm install --save-dev jest @types/jest
npm test
npm run test:coverage

# Sprint 3
npm install @sentry/node
# Implémenter cache et métriques
npm start

# Sprint 4
# Créer docs/
git add docs/
git commit -m "docs: complete project documentation"

# Final
npm run lint:fix
npm test
npm audit
git push origin feature/security-improvements
```

---

**Bonne chance pour l'implémentation! 🎉**
