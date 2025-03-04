const fs = require('node:fs');
const path = require('node:path');

module.exports = (directory, foldersOnly = false) => {
	const fileNames = [];

	const files = fs.readdirSync(directory, { withFileTypes: true });

	for (const file of files) {
		const filePath = path.join(directory, file.name);

		if (foldersOnly && file.isDirectory()) {
			fileNames.push(filePath);
		} else if (foldersOnly && file.isFile()) {
			fileNames.push(filePath);
		}
	}

};