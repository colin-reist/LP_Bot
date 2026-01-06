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

module.exports = { ensureUserExists };
