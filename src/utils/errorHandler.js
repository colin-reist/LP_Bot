const logger = require('#logger');

/**
 * Types d'erreurs personnalisées
 */
class BotError extends Error {
	constructor(message, type = 'UNKNOWN', context = {}) {
		super(message);
		this.name = 'BotError';
		this.type = type;
		this.context = context;
		this.timestamp = new Date();
	}
}

class CommandError extends BotError {
	constructor(message, context = {}) {
		super(message, 'COMMAND_ERROR', context);
		this.name = 'CommandError';
	}
}

class DatabaseError extends BotError {
	constructor(message, context = {}) {
		super(message, 'DATABASE_ERROR', context);
		this.name = 'DatabaseError';
	}
}

class ValidationError extends BotError {
	constructor(message, context = {}) {
		super(message, 'VALIDATION_ERROR', context);
		this.name = 'ValidationError';
	}
}

class PermissionError extends BotError {
	constructor(message, context = {}) {
		super(message, 'PERMISSION_ERROR', context);
		this.name = 'PermissionError';
	}
}

/**
 * Gestionnaire d'erreurs centralisé
 */
class ErrorHandler {
	constructor() {
		this.errorCounts = new Map();
		this.setupGlobalHandlers();
	}

	/**
	 * Configure les gestionnaires d'erreurs globaux
	 */
	setupGlobalHandlers() {
		process.on('uncaughtException', (error) => {
			logger.error('Uncaught Exception:', error);
			this.logError(error, { type: 'UNCAUGHT_EXCEPTION' });
		});

		process.on('unhandledRejection', (reason, promise) => {
			logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
			this.logError(reason, { type: 'UNHANDLED_REJECTION' });
		});

		process.on('warning', (warning) => {
			logger.warn('Process Warning:', warning);
		});
	}

	/**
	 * Gère une erreur de commande Discord
	 * @param {Error} error - L'erreur
	 * @param {Interaction} interaction - L'interaction Discord
	 * @returns {Promise<void>}
	 */
	async handleCommandError(error, interaction) {
		const context = {
			command: interaction.commandName,
			user: interaction.user.tag,
			userId: interaction.user.id,
			guild: interaction.guild?.name || 'DM',
			guildId: interaction.guildId || 'DM',
			channelId: interaction.channelId,
		};

		this.logError(error, context);
		await this.sendUserFriendlyError(error, interaction);
	}

	/**
	 * Gère une erreur d'événement Discord
	 * @param {Error} error - L'erreur
	 * @param {string} eventName - Nom de l'événement
	 * @param {Object} eventData - Données de l'événement
	 */
	handleEventError(error, eventName, eventData = {}) {
		const context = {
			event: eventName,
			...eventData,
		};

		this.logError(error, context);
	}

	/**
	 * Gère une erreur de base de données
	 * @param {Error} error - L'erreur
	 * @param {Object} context - Contexte additionnel
	 */
	handleDatabaseError(error, context = {}) {
		const dbContext = {
			...context,
			errorType: 'DATABASE',
		};

		this.logError(error, dbContext);
	}

	/**
	 * Log une erreur avec contexte
	 * @param {Error} error - L'erreur
	 * @param {Object} context - Contexte
	 */
	logError(error, context = {}) {
		// Incrémente le compteur d'erreurs
		const errorKey = error.name || 'Unknown';
		this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

		// Log détaillé
		logger.error({
			message: error.message,
			name: error.name,
			stack: error.stack,
			context: context,
			timestamp: new Date().toISOString(),
			errorCount: this.errorCounts.get(errorKey),
		});
	}

	/**
	 * Envoie un message d'erreur convivial à l'utilisateur
	 * @param {Error} error - L'erreur
	 * @param {Interaction} interaction - L'interaction Discord
	 * @returns {Promise<void>}
	 */
	async sendUserFriendlyError(error, interaction) {
		let userMessage = '❌ Une erreur est survenue.';

		// Messages personnalisés selon le type d'erreur
		if (error instanceof ValidationError) {
			userMessage = `❌ ${error.message}`;
		} else if (error instanceof PermissionError) {
			userMessage = `❌ ${error.message}`;
		} else if (error instanceof DatabaseError) {
			userMessage = '❌ Erreur de base de données. Réessayez dans quelques instants.';
		} else if (error instanceof CommandError) {
			userMessage = `❌ ${error.message}`;
		} else if (error.code === 10062) {
			// Discord: Unknown Interaction
			return; // Ne pas répondre, l'interaction a expiré
		} else if (error.code === 50013) {
			userMessage = '❌ Je n\'ai pas les permissions nécessaires pour effectuer cette action.';
		}

		try {
			// Essaie de répondre ou d'éditer la réponse
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({
					content: userMessage,
					ephemeral: true,
				}).catch(() => {});
			} else {
				await interaction.reply({
					content: userMessage,
					ephemeral: true,
				}).catch(() => {});
			}
		} catch (replyError) {
			logger.error('Could not send error message to user:', replyError);
		}
	}

	/**
	 * Wrapper pour exécuter une fonction async avec gestion d'erreurs
	 * @param {Function} fn - Fonction à exécuter
	 * @param {Object} context - Contexte
	 * @returns {Function}
	 */
	wrap(fn, context = {}) {
		return async (...args) => {
			try {
				return await fn(...args);
			} catch (error) {
				this.logError(error, context);
				throw error;
			}
		};
	}

	/**
	 * Récupère les statistiques d'erreurs
	 * @returns {Object}
	 */
	getErrorStats() {
		const stats = {};
		for (const [key, count] of this.errorCounts.entries()) {
			stats[key] = count;
		}
		return stats;
	}

	/**
	 * Réinitialise les compteurs d'erreurs
	 */
	resetErrorCounts() {
		this.errorCounts.clear();
	}
}

// Instance singleton
const errorHandler = new ErrorHandler();

module.exports = {
	errorHandler,
	BotError,
	CommandError,
	DatabaseError,
	ValidationError,
	PermissionError,
};
