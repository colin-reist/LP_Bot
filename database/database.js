require('dotenv').config();

const path = require('node:path');
const { Sequelize, DataTypes } = require('sequelize');

// Configuration depuis variables d'environnement
const database = process.env.DB_NAME;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const host = process.env.DB_HOST;
const port = process.env.DB_PORT;
const dialect = process.env.DB_DIALECT || 'mysql';
const useSsl = process.env.DB_SSL === 'true';

const useSqlite = dialect === 'sqlite' || !database;
const sequelize = useSqlite
	? new Sequelize({
		dialect: 'sqlite',
		storage: path.join(__dirname, 'database.sqlite'),
		logging: false,
	})
	: new Sequelize(database, user, password, {
		host: host,
		port: port ? Number(port) : undefined,
		dialect: dialect,
		logging: false,
		dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: true } } : undefined,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
	});


const Users = sequelize.define('Users', {
	pk_user: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	// Changed to BIGINT
	discord_identifier: { type: DataTypes.BIGINT, allowNull: false, unique: true },
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
	// 'ban', 'warn', 'kick'
	type: { type: DataTypes.STRING, allowNull: false },
	// NULL si permanent
	expires_at: { type: DataTypes.DATE, allowNull: true },
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
	// 'pending', 'approved', 'rejected'
	status: { type: DataTypes.STRING, allowNull: false },
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

// Paramètres du bot modifiables à chaud (ex: salons configurés via /config)
const BotSettings = sequelize.define('BotSettings', {
	setting_key: { type: DataTypes.STRING(100), primaryKey: true },
	setting_value: { type: DataTypes.STRING, allowNull: false },
	// ID Discord de la dernière personne ayant modifié
	updated_by: { type: DataTypes.STRING(32), allowNull: true },
}, { timestamps: true, tableName: 'BotSettings' });

// Synchronisation de la base de données
// Ne pas forcer la synchronisation à chaque démarrage
sequelize.sync({ force: false });

module.exports = { Users, Punishments, Suggestions, Boosts, BotSettings, sequelize };