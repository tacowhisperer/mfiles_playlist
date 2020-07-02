const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mm = require('music-metadata');
const sharp = require('sharp');

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
	console.log('');
	console.log(`Processing music files in "${directory}"`);

	fs.readdir(directory, async (err, files) => {
		if (err) throw err;

		const fileData = [];
		for (let i = 0; i < files.length; i++) {
			process.stdout.write(`Progress: ${Math.round(10000 * (i + 1) / files.length) / 100}%${'\033[0G'}`);

			try {
				const metadata = (await mm.parseFile(`${directory}${s}${files[i]}`)).common;
				
				const title = metadata.title;
				const artist = metadata.artist;
				const album = metadata.album;
				const track = metadata.track;

				// We only want basic information
				let image = '<img></img>';
				if (metadata.picture instanceof Array) {
					const pic = metadata.picture[0];
					const imgBuffer = await sharp(pic.data).resize(100, 100).toBuffer();


					image = `<img src="data:${pic.format};base64,${imgBuffer.toString('base64')}"></img>`;
				}

				fileData.push({
					artist: artist,
					album: album,
					title: title,
					track: track,
					cover: image
				});
			} catch (e) {
				console.error(`Failed extraction of data for file "${files[i]}"`);
				console.error(e);
			}
		}

		// Sort the playlist information on artist, then by album, finally by track number.
		fileData.sort((a, b) => {
			if (a.artist < b.artist)
				return -1;
			else if (a.artist > b.artist)
				return 1;

			// Same artist, so sort by album
			if (a.album < b.album)
				return -1;
			else if (a.album > b.album)
				return 1;

			// Same album, so sort by track number
			if (a.track.no < b.track.no)
				return -1;
			else if (a.track.no > b.track.no)
				return 1;

			return 0;
		});

		const table = fileData.map(data => {
			const song  =   `<p class="song_title">
						${data.title}
					</p>
					<p class="song_artist_album">
						${data.artist} | ${data.album}${data.track.no ? ` | Track No. ${data.track.no}` : ''}
					</p>`;

			return `<tr><td>${data.cover}</td><td>${song}</td></tr>`;
		}).join('');

		// Write the output playlist to an HTML file
		fs.writeFileSync('playlist.html', `<html><body><table>${table}</table></body></html>`);

		console.log('\r');
		console.log('Done.')
		console.log('');
	});
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
		if (file !== 'node_modules' && file !== ".git") {
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
