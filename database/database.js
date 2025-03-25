const { Sequelize, DataTypes } = require('sequelize');
const { database, user, password } = require('../config/MainConfig.json');

const sequelize = new Sequelize(database, user, password, {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});

const User = sequelize.define('User', {
    pk_user: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    discord_identifier: { type: DataTypes.BIGINT, allowNull: false, unique: true }, // Changed to BIGINT
    username: { type: DataTypes.STRING, allowNull: false },
    experience: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

const Punishment = sequelize.define('Punishment', {
    pk_punishment: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'pk_user' }
    },
    fk_punisher: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'pk_user' }
    },
    reason: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    type: { type: DataTypes.STRING, allowNull: false }, // 'ban', 'warn', 'kick'
    expires_at: { type: DataTypes.DATE, allowNull: true } // NULL si permanent
}, { timestamps: true, tableName: 'Punishment' });

const Suggestion = sequelize.define('Suggestion', {
    pk_suggestion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    fk_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'pk_user' }
    },
    date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    positive_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    negative_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.STRING, allowNull: false }, // 'pending', 'approved', 'rejected'
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
}, { timestamps: true });

const Boost = sequelize.define('Boost', {
    pk_boost: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'pk_user' }
    },
    boost_date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
}, { timestamps: true });

const Concours = sequelize.define('Concours', {
    pk_concours: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fk_user: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: User, key: 'pk_user' }
    },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    post_link: { type: DataTypes.STRING, allowNull: false }
}, { timestamps: true });

// Synchronisation de la base de données
sequelize.sync({ force: false }); // Ne pas forcer la synchronisation à chaque démarrage

module.exports = { User, Punishment, Suggestion, Boost, Concours, sequelize };