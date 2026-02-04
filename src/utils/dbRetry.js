const logger = require('#logger');
const { DatabaseError } = require('./errorHandler.js');

/**
 * Configuration du retry
 */
const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000, // 1 seconde
	maxDelay: 10000, // 10 secondes
	exponentialBase: 2,
};

/**
 * Calcule le délai avant retry avec backoff exponentiel
 * @param {number} attempt - Numéro de la tentative
 * @returns {number} Délai en millisecondes
 */
function calculateDelay(attempt) {
	const delay = Math.min(
		RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.exponentialBase, attempt),
		RETRY_CONFIG.maxDelay
	);
	// Ajoute un peu de jitter (±20%) pour éviter les thundering herds
	const jitter = delay * 0.2 * (Math.random() - 0.5);
	return Math.floor(delay + jitter);
}

/**
 * Détermine si une erreur est retryable
 * @param {Error} error - L'erreur
 * @returns {boolean}
 */
function isRetryableError(error) {
	// Erreurs réseau/connexion retryables
	const retryableCodes = [
		'ETIMEDOUT',
		'ECONNREFUSED',
		'ECONNRESET',
		'ENOTFOUND',
		'ENETUNREACH',
		'EAI_AGAIN',
	];

	// Erreurs Sequelize retryables
	const retryableSequelizeErrors = [
		'SequelizeConnectionError',
		'SequelizeConnectionRefusedError',
		'SequelizeHostNotFoundError',
		'SequelizeHostNotReachableError',
		'SequelizeConnectionTimedOutError',
	];

	return (
		retryableCodes.includes(error.code) ||
		retryableSequelizeErrors.includes(error.name) ||
		(error.parent && retryableCodes.includes(error.parent.code))
	);
}

/**
 * Wrapper qui retry automatiquement une opération de base de données
 * @param {Function} operation - Fonction async à exécuter
 * @param {Object} context - Contexte pour les logs
 * @param {number} maxRetries - Nombre max de tentatives
 * @returns {Promise<any>} Résultat de l'opération
 */
async function withRetry(operation, context = {}, maxRetries = RETRY_CONFIG.maxRetries) {
	let lastError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			// Tentative d'exécution
			const result = await operation();

			// Si on a réussi après un retry, on le log
			if (attempt > 0) {
				logger.info(`DB operation succeeded after ${attempt} retries`, context);
			}

			return result;
		} catch (error) {
			lastError = error;

			// Si ce n'est pas retryable ou si on a épuisé les tentatives
			if (!isRetryableError(error) || attempt >= maxRetries) {
				logger.error(`DB operation failed after ${attempt + 1} attempts`, {
					...context,
					error: error.message,
					errorName: error.name,
					isRetryable: isRetryableError(error),
				});
				throw new DatabaseError(error.message, {
					...context,
					attempts: attempt + 1,
					originalError: error.name,
				});
			}

			// Calcule le délai avant retry
			const delay = calculateDelay(attempt);

			logger.warn(`DB operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
				...context,
				error: error.message,
				errorCode: error.code,
				delay,
			});

			// Attend avant le prochain retry
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	// Ne devrait jamais arriver ici, mais au cas où
	throw lastError;
}

/**
 * Wrapper pour les opérations Sequelize courantes
 */
const dbOperations = {
	/**
	 * Find avec retry automatique
	 */
	async findOne(model, options, context = {}) {
		return withRetry(
			() => model.findOne(options),
			{ operation: 'findOne', model: model.name, ...context }
		);
	},

	/**
	 * FindAll avec retry automatique
	 */
	async findAll(model, options, context = {}) {
		return withRetry(
			() => model.findAll(options),
			{ operation: 'findAll', model: model.name, ...context }
		);
	},

	/**
	 * Create avec retry automatique
	 */
	async create(model, data, context = {}) {
		return withRetry(
			() => model.create(data),
			{ operation: 'create', model: model.name, ...context }
		);
	},

	/**
	 * Update avec retry automatique
	 */
	async update(instance, data, context = {}) {
		return withRetry(
			() => instance.update(data),
			{ operation: 'update', model: instance.constructor.name, ...context }
		);
	},

	/**
	 * Destroy avec retry automatique
	 */
	async destroy(instance, context = {}) {
		return withRetry(
			() => instance.destroy(),
			{ operation: 'destroy', model: instance.constructor.name, ...context }
		);
	},

	/**
	 * Increment avec retry automatique
	 */
	async increment(instance, fields, context = {}) {
		return withRetry(
			() => instance.increment(fields),
			{ operation: 'increment', model: instance.constructor.name, fields, ...context }
		);
	},
};

module.exports = {
	withRetry,
	dbOperations,
	RETRY_CONFIG,
	isRetryableError,
};
