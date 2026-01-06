const ids = require('#config/ids');

/**
 * Checks if a member has the Staff role.
 * @param {Interaction|Message} context The interaction or message context.
 * @returns {boolean} True if the member has the Staff role.
 */
function hasStaffRole(context) {
    const member = context.member;
    if (!member) return false;

    // Retrieve Staff role ID from ids.json. 
    // Assuming ids.roles.staff is "Staff" (name) or an ID. 
    // The previous code was checking by name 'Staff'.
    // Ideally we should use an ID in ids.json, but for now we reproduce the logic or use the ID if available.
    // Based on previous files: const requiredRole = interaction.guild.roles.cache.find(role => role.name === 'Staff');

    // If ids.roles.staff is literally "Staff" string, we keep legacy name check, otherwise we check ID.
    const staffRef = ids.roles.staff;

    if (staffRef === 'Staff') {
        return member.roles.cache.some(role => role.name === 'Staff');
    } else {
        return member.roles.cache.has(staffRef);
    }
}

module.exports = { hasStaffRole };
