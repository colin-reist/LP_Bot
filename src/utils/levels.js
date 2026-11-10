/**
 * Calcul du niveau à partir de l'XP totale.
 * XP nécessaire pour passer du niveau n au niveau n+1 : 2.5·n² + 50·n + 100.
 * Source unique utilisée par le gain d'XP (rôles, annonces), /rank et /top.
 * @param {number} xp
 * @returns {number}
 */
function getLevelFromXP(xp) {
	let level = 0;
	let remaining = xp;
	for (;;) {
		const requiredXP = 2.5 * level ** 2 + 50 * level + 100;
		if (remaining < requiredXP) return level;
		remaining -= requiredXP;
		level++;
	}
}

module.exports = { getLevelFromXP };
