const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mm = require('music-metadata');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const s = path.sep;

/**
 * Generates an HTML list of music metadata from a directory of music files.
 * @param  {String} directory The path to where the music files are stored.
 */
function app(directory) {
	console.log(`You chose the directory "${directory}"`);
}

/**
 * Check if a value is a number.
 * @param  {} val Any JavaScript value of any JavaScript type.
 * @return {Boolean} Whether or not the input value is a Number.
 */
function isNumber(val) {
	return +val === +val;
}

/**
 * Creates an option that can be added to some menu.
 * @param {Array} menu The array that holds the menu options to execute.
 * @param {String} desc The description of the menu
 * @param {Function} fn The function to be executed upon selecting this option.
 */
function addOption(menu, desc, fn = () => {}) {
	console.log(`\t${menu.length + 1}. ${desc}`);
	menu.push(fn);
}

// Main app
fs.readdir('.', (err, files) => {
	if (err) throw err;

	// App description
	console.log('');
	console.log('~~ HTML Playlist Generator ~~');
	console.log(' Choose a directory of music to process, or select an option below:');
	console.log('');

	const menu = [];
	for (let i = 0; i < files.length; i++) {
		const file = files[i];

		// Skip the node_modules directory since that's part of 
		if (file !== 'node_modules') {
			try {
				if (fs.lstatSync(`.${s}${files[i]}`).isDirectory())
					addOption(menu, files[i], () => app(path.resolve(files[i])));
			} catch (e) {
				// Do nothing.
			}
		}
	}

	// Add the option to type in an absolute path
	addOption(menu, 'Type In Abs Path to Music Dir', () => {
		const absRL = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		absRL.question('Type in the absolute path here: ', path => {
			absRL.close();
			app(path);
		});
	});

	// Final option to just skip the app
	addOption(menu, 'Exit Application', () => {
		console.log('Exiting App');
		process.exit(0);
	});

	// Execute the app option
	rl.question(`\n Choice [1-${menu.length}]: `, option => {
		rl.close();
		console.log('');

		// Any invalid option closes the app by default.
		if (!isNumber(option) || +option < 1 || +option > menu.length) {
			console.log('Invalid option. Exiting app.');
			process.exit(-1);
		}

		// Execute the selected option.
		menu[+option - 1]();
	});
});
