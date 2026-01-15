const { ValidationError } = require('./errorHandler.js');

/**
 * Validateurs pour les inputs utilisateurs
 */

/**
 * Valide une chaîne de caractères
 * @param {string} value - Valeur à valider
 * @param {Object} options - Options de validation
 * @returns {string} Valeur validée
 */
function validateString(value, options = {}) {
	const {
		name = 'value',
		minLength = 0,
		maxLength = Infinity,
		pattern = null,
		trim = true,
		required = true,
	} = options;

	// Vérifie si requis
	if (required && (value === null || value === undefined || value === '')) {
		throw new ValidationError(`${name} est requis.`);
	}

	// Si pas requis et vide, return undefined
	if (!required && (value === null || value === undefined || value === '')) {
		return undefined;
	}

	// Vérifie le type
	if (typeof value !== 'string') {
		throw new ValidationError(`${name} doit être une chaîne de caractères.`);
	}

	// Trim si demandé
	let processedValue = trim ? value.trim() : value;

	// Vérifie la longueur minimale
	if (processedValue.length < minLength) {
		throw new ValidationError(`${name} doit contenir au moins ${minLength} caractère(s).`);
	}

	// Vérifie la longueur maximale
	if (processedValue.length > maxLength) {
		throw new ValidationError(`${name} ne peut pas dépasser ${maxLength} caractère(s).`);
	}

	// Vérifie le pattern
	if (pattern && !pattern.test(processedValue)) {
		throw new ValidationError(`${name} a un format invalide.`);
	}

	return processedValue;
}

/**
 * Valide un nombre
 * @param {number} value - Valeur à valider
 * @param {Object} options - Options de validation
 * @returns {number} Valeur validée
 */
function validateNumber(value, options = {}) {
	const {
		name = 'value',
		min = -Infinity,
		max = Infinity,
		integer = false,
		required = true,
	} = options;

	// Vérifie si requis
	if (required && (value === null || value === undefined)) {
		throw new ValidationError(`${name} est requis.`);
	}

	// Si pas requis et vide, return undefined
	if (!required && (value === null || value === undefined)) {
		return undefined;
	}

	// Vérifie le type
	if (typeof value !== 'number' || isNaN(value)) {
		throw new ValidationError(`${name} doit être un nombre valide.`);
	}

	// Vérifie si entier
	if (integer && !Number.isInteger(value)) {
		throw new ValidationError(`${name} doit être un nombre entier.`);
	}

	// Vérifie min/max
	if (value < min) {
		throw new ValidationError(`${name} doit être supérieur ou égal à ${min}.`);
	}

	if (value > max) {
		throw new ValidationError(`${name} doit être inférieur ou égal à ${max}.`);
	}

	return value;
}

/**
 * Valide un identifiant Discord
 * @param {string} value - ID Discord
 * @param {Object} options - Options
 * @returns {string} ID validé
 */
function validateDiscordId(value, options = {}) {
	const { name = 'ID Discord' } = options;

	const validated = validateString(value, {
		name,
		minLength: 17,
		maxLength: 20,
		pattern: /^\d+$/,
	});

	return validated;
}

/**
 * Valide une raison de modération
 * @param {string} value - Raison
 * @param {Object} options - Options
 * @returns {string} Raison validée
 */
function validateModerationReason(value, options = {}) {
	const { name = 'Raison', maxLength = 500 } = options;

	return validateString(value, {
		name,
		minLength: 3,
		maxLength,
		trim: true,
		required: true,
	});
}

/**
 * Valide un tag de recherche (pour r34, etc.)
 * @param {string} value - Tag
 * @param {Object} options - Options
 * @returns {string} Tag validé
 */
function validateSearchTag(value, options = {}) {
	const { name = 'Tag', maxLength = 100 } = options;

	let validated = validateString(value, {
		name,
		minLength: 2,
		maxLength,
		trim: true,
		required: true,
	});

	// Sanitize: garde seulement alphanumériques, tirets, underscores et espaces
	validated = validated.replace(/[^a-zA-Z0-9_\-\s]/g, '');

	if (validated.length < 2) {
		throw new ValidationError(`${name} doit contenir au moins 2 caractères valides après sanitization.`);
	}

	return validated.toLowerCase();
}

/**
 * Valide une URL
 * @param {string} value - URL
 * @param {Object} options - Options
 * @returns {string} URL validée
 */
function validateUrl(value, options = {}) {
	const { name = 'URL', allowedProtocols = ['http:', 'https:'] } = options;

	const validated = validateString(value, {
		name,
		maxLength: 2048,
		required: true,
	});

	try {
		const url = new URL(validated);
		if (!allowedProtocols.includes(url.protocol)) {
			throw new ValidationError(`${name} doit utiliser un protocole autorisé (${allowedProtocols.join(', ')}).`);
		}
		return validated;
	} catch (error) {
		throw new ValidationError(`${name} n'est pas une URL valide.`);
	}
}

/**
 * Validator pour les options de commande Discord
 */
class CommandOptionsValidator {
	constructor(interaction) {
		this.interaction = interaction;
	}

	/**
	 * Récupère et valide une option string
	 */
	getString(name, validator = null, options = {}) {
		const value = this.interaction.options.getString(name);

		if (validator) {
			return validator(value, { name, ...options });
		}

		return validateString(value, { name, ...options });
	}

	/**
	 * Récupère et valide une option number
	 */
	getNumber(name, options = {}) {
		const value = this.interaction.options.getNumber(name);
		return validateNumber(value, { name, ...options });
	}

	/**
	 * Récupère et valide une option integer
	 */
	getInteger(name, options = {}) {
		const value = this.interaction.options.getInteger(name);
		return validateNumber(value, { name, integer: true, ...options });
	}

	/**
	 * Récupère et valide un user
	 */
	getUser(name, options = { required: true }) {
		const user = this.interaction.options.getUser(name);

		if (options.required && !user) {
			throw new ValidationError(`Utilisateur ${name} requis.`);
		}

		return user;
	}

	/**
	 * Récupère et valide un member
	 */
	getMember(name, options = { required: true }) {
		const member = this.interaction.options.getMember(name);

		if (options.required && !member) {
			throw new ValidationError(`Membre ${name} requis ou introuvable.`);
		}

		return member;
	}
}

/**
 * Sanitize HTML/XSS
 * @param {string} value - Valeur à sanitizer
 * @returns {string} Valeur sanitizée
 */
function sanitizeHtml(value) {
	if (typeof value !== 'string') return value;

	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
		.replace(/\//g, '&#x2F;');
}

module.exports = {
	validateString,
	validateNumber,
	validateDiscordId,
	validateModerationReason,
	validateSearchTag,
	validateUrl,
	CommandOptionsValidator,
	sanitizeHtml,
};
