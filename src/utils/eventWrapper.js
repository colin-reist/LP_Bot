const logger = require('#logger');
const { errorHandler } = require('#errorHandler');

/**
 * Wrapper pour les event handlers Discord
 * Ajoute automatiquement la gestion d'erreurs et le logging
 */

/**
 * Enveloppe un event handler avec gestion d'erreurs automatique
 * @param {string} eventName - Nom de l'événement Discord
 * @param {Function} handler - Fonction handler à exécuter
 * @param {Object} options - Options de configuration
 * @returns {Function} Handler enveloppé avec gestion d'erreurs
 */
function wrapEventHandler(eventName, handler, options = {}) {
	const {
		logExecution = false,
		timeout = 30000, // 30 secondes max par défaut
		retryOnError = false,
	} = options;

	return async (...args) => {
		const startTime = Date.now();

		try {
			// Log l'exécution si demandé
			if (logExecution) {
				logger.debug(`Event ${eventName} triggered`);
			}

			// Timeout protection
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error(`Event ${eventName} timeout after ${timeout}ms`)), timeout);
			});

			// Exécution avec timeout
			const result = await Promise.race([
				handler(...args),
				timeoutPromise
			]);

			// Track successful event processing
			if (args[0]?.client?.healthCheck) {
				args[0].client.healthCheck.incrementMetric('eventsProcessed');
			}

			// Log le temps d'exécution si > 5s
			const executionTime = Date.now() - startTime;
			if (executionTime > 5000) {
				logger.warn(`Event ${eventName} took ${executionTime}ms to execute`);
			}

			return result;

		} catch (error) {
			// Contexte de l'erreur
			const context = {
				event: eventName,
				executionTime: Date.now() - startTime,
				argsCount: args.length,
			};

			// Ajoute des informations contextuelles selon le type d'événement
			if (args[0]) {
				if (args[0].guild) context.guild = args[0].guild.name;
				if (args[0].user) context.user = args[0].user.tag;
				if (args[0].author) context.author = args[0].author.tag;
			}

			// Track errors
			if (args[0]?.client?.healthCheck) {
				args[0].client.healthCheck.incrementMetric('errors');
			}

			// Log avec errorHandler
			await errorHandler.handleEventError(error, eventName, context);

			// Retry si demandé (uniquement pour erreurs réseau)
			if (retryOnError && isRetryableError(error)) {
				logger.info(`Retrying event ${eventName} after error`);
				try {
					return await handler(...args);
				} catch (retryError) {
					logger.error(`Retry failed for event ${eventName}:`, retryError);
				}
			}
		}
	};
}

/**
 * Détermine si une erreur est retryable
 */
function isRetryableError(error) {
	const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
	const retryableMessages = ['timeout', 'network', 'connection'];

	return (
		retryableCodes.includes(error.code) ||
		retryableMessages.some(msg => error.message?.toLowerCase().includes(msg))
	);
}

/**
 * Enregistre un événement avec gestion d'erreurs automatique
 * @param {Client} client - Client Discord
 * @param {string} eventName - Nom de l'événement
 * @param {Function} handler - Handler à exécuter
 * @param {Object} options - Options
 */
function registerEvent(client, eventName, handler, options = {}) {
	const wrappedHandler = wrapEventHandler(eventName, handler, options);

	if (options.once) {
		client.once(eventName, wrappedHandler);
	} else {
		client.on(eventName, wrappedHandler);
	}

	logger.debug(`Event registered: ${eventName} (once: ${options.once || false})`);
}

/**
 * Helper pour créer un event handler sécurisé
 * @param {string} eventName - Nom de l'événement
 * @param {Function} handler - Fonction handler
 * @param {Object} options - Options
 * @returns {Function} Module.exports compatible function
 */
function createEventHandler(eventName, handler, options = {}) {
	return (client) => {
		registerEvent(client, eventName, handler, options);
	};
}

module.exports = {
	wrapEventHandler,
	registerEvent,
	createEventHandler,
	isRetryableError,
};
