const { Users } = require('#database');
const logger = require('#logger');

/**
 * Retrieves a user from the database or creates them if they don't exist.
 * @param {string} discordId The Discord ID of the user.
 * @param {string} username The username of the user.
 * @returns {Promise<Model>} The user model instance.
 */
async function ensureUserExists(discordId, username) {
    try {
        let user = await Users.findOne({ where: { discord_identifier: discordId } });
        if (!user) {
            user = await Users.create({
                discord_identifier: discordId,
                username: username,
                experience: 1, // Default experience
            });
            logger.debug(`Created new user in DB: ${username} (${discordId})`);
        }
        return user;
    } catch (error) {
        logger.error(`Error ensuring user exists for ${username} (${discordId}):`, error);
        throw error;
    }
}

/**
 * Anonymise un utilisateur suite à un ban : supprime les données personnelles
 * (pseudo, identifiant Discord) tout en conservant la ligne (et donc l'historique
 * de punitions/suggestions/etc. qui y est lié via fk_user) pour l'audit trail.
 * @param {Model} user L'instance Sequelize du user à anonymiser.
 */
async function anonymizeUser(user) {
    try {
        await user.update({
            discord_identifier: -user.pk_user,
            username: 'Utilisateur banni',
        });
        logger.debug(`Utilisateur anonymisé suite à un ban (pk_user: ${user.pk_user})`);
    } catch (error) {
        logger.error(`Erreur lors de l'anonymisation de l'utilisateur (pk_user: ${user.pk_user}):`, error);
    }
}

module.exports = { ensureUserExists, anonymizeUser };
