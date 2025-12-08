const path = require('node:path');
const { Sequelize, DataTypes } = require('sequelize');
const { database, user, password, dialect = 'mysql' } = require('../config/config.json');

const useSqlite = dialect === 'sqlite' || !database;
const sequelize = useSqlite
  ? new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, 'database.sqlite'), logging: false })
  : new Sequelize(database, user, password, { host: 'eu02-sql.pebblehost.com', dialect: 'mysql', logging: false });


const Users = sequelize.define('Users', {
	pk_user: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	discord_identifier: { type: DataTypes.BIGINT, allowNull: false, unique: true }, // Changed to BIGINT
	username: { type: DataTypes.STRING, allowNull: false },
	experience: { type: DataTypes.INTEGER, defaultValue: 0 },
	is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: true });

const Punishments = sequelize.define('Punishments', {
	pk_punishment: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	fk_user: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: { model: Users, key: 'pk_user' },
	},
	fk_punisher: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: { model: Users, key: 'pk_user' },
	},
	reason: { type: DataTypes.STRING, allowNull: false },
	date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
	type: { type: DataTypes.STRING, allowNull: false }, // 'ban', 'warn', 'kick'
	expires_at: { type: DataTypes.DATE, allowNull: true }, // NULL si permanent
}, { timestamps: true, tableName: 'Punishments' });

const Suggestions = sequelize.define('Suggestions', {
	pk_suggestion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	title: { type: DataTypes.STRING, allowNull: false },
	description: { type: DataTypes.STRING, allowNull: false },
	fk_user: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: { model: Users, key: 'pk_user' },
	},
	date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
	positive_count: { type: DataTypes.INTEGER, defaultValue: 0 },
	negative_count: { type: DataTypes.INTEGER, defaultValue: 0 },
	status: { type: DataTypes.STRING, allowNull: false }, // 'pending', 'approved', 'rejected'
	updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
}, { timestamps: true });

const Boosts = sequelize.define('Boosts', {
	pk_boost: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	fk_user: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: { model: Users, key: 'pk_user' },
	},
	boost_date: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
}, { timestamps: true });

const Concours = sequelize.define('Concours', {
	pk_concours: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	fk_user: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: { model: Users, key: 'pk_user' },
	},
	count: { type: DataTypes.INTEGER, defaultValue: 0 },
	post_link: { type: DataTypes.STRING, allowNull: false },
}, { timestamps: true });

// Synchronisation de la base de données
sequelize.sync({ force: false }); // Ne pas forcer la synchronisation à chaque démarrage

module.exports = { Users, Punishments, Suggestions, Boosts, Concours, sequelize };