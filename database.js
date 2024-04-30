const Sequelize = require('sequelize');
const { database, user, password } = require('./config.json');

const sequelize = new Sequelize(database, user, password, {
	host: 'eu02-sql.pebblehost.com',
	dialect: 'mysql',
	logging: false,
	// SQLite only
	storage: 'database.sqlite',
});

const Tags = sequelize.define('tags', {
	messageID: {
		type: Sequelize.STRING,
		unique: true,
	},
	messageAuthorName: Sequelize.STRING,
	messageAuthorId: Sequelize.STRING,
	messageAuthorAvatar: Sequelize.STRING,
	messageURL: Sequelize.TEXT,
	reactCount: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	attachment: Sequelize.STRING,
	posted: Sequelize.BOOLEAN,
	linkedEmbed: Sequelize.TEXT,
});

const Booster = sequelize.define('users', {
	userId: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true,
	},
	username: Sequelize.STRING,
	boostCount: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
});

const suggestion = sequelize.define('suggestion', {
	suggestionId: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true,
	},
	suggestionSuggestion: Sequelize.STRING,
	suggestionSuggerant: Sequelize.STRING,
	suggestionCountTrue: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	suggestionCountFalse: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	suggestionImage: Sequelize.STRING,
});

const userLevels = sequelize.define('userLevels', {
    userName: Sequelize.STRING,
    userID: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
    },
    userLevels: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    userXP: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
}); 

module.exports = { Tags, Booster, suggestion, userLevels, sequelize };