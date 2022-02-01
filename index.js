const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mm = require('music-metadata');
const sharp = require('sharp');
const sanitize = require('sanitize-filename')

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const s = path.sep;

const ICO_SIZE = 90;

/**
 * Generates an HTML list of music metadata from a directory of music files.
 * @param  {String} directory The path to where the music files are stored.
 * @param  {String} output The directory to output the HTML content to. If non specified, defaults to ./playlist
 */
function app(directory, output = './playlist') {
	const OUTPUT_DIR = path.resolve(output);
	try {
		fs.mkdirSync(OUTPUT_DIR);
	} catch (err) {
		if (err.code !== 'EEXIST')
			throw err;
	}

	console.log('');
	console.log(`Processing music files in "${directory}"`);

	const COVER_DIR = 'covers';
	try {
		fs.mkdirSync(`${OUTPUT_DIR}${path.sep}${COVER_DIR}`);
	} catch (err) {
		if (err.code !== 'EEXIST')
			throw err;
	}

	fs.readdir(directory, async (err, files) => {
		if (err) throw err;

		const artistsMap = {};
		for (let i = 0; i < files.length; i++) {
			process.stdout.write(`Progress: ${i + 1}/${files.length} - ${Math.round(10000 * (i + 1) / files.length) / 100}%${'\033[0G'}`);

			// Skip AlbumArt images injected by Windows media player.
			if (!files[i].match(/^AlbumArt_/)) {
				try {
					const metadata = (await mm.parseFile(`${directory}${s}${files[i]}`)).common;
					
					const title = metadata.title;
					const artist = metadata.artist;
					const album = metadata.album;
					const track = metadata.track;

					// We only want basic information
					let pic = metadata.picture instanceof Array ? metadata.picture[0] : false;
					let imageBuffer = null;
					let imageType = null;
					if (pic) {
						imageBuffer = await sharp(pic.data, {failOnError: false}).resize(ICO_SIZE, ICO_SIZE).toBuffer();
						//image = `<img src="data:${pic.format};base64,${imgBuffer.toString('base64')}"></img>`;
						imageType = getMediaExt(pic.format);
					}

					// Add the missing artist if not available
					if (!(artistsMap[artist] instanceof Object)) {
						artistsMap[artist] = {
							__albums: new Set([])
						};
					}

					// Add the missing album if not available
					if (!(artistsMap[artist][album] instanceof Object)) {
						fs.writeFileSync(`${OUTPUT_DIR}${path.sep}${COVER_DIR}${path.sep}${sanitize(`${artist}-${album}${getMediaExt(pic.format)}`)}`, imageBuffer);
						artistsMap[artist][album] = {
							cover: imageType,
							tracks: []
						};
					}

					artistsMap[artist].__albums.add(album);
					artistsMap[artist][album].tracks.push({
						title: title,
						track: track.no
					});
				} catch (e) {
					console.error(`Failed extraction of data for file "${files[i]}"`);
					console.error(e);
				}
			}
		}

		const artistKeys = Object.keys(artistsMap);

		// Make sure to iterate throuw the artistsMap in order by artist name.
		artistKeys.sort();

		// Sort the albums alphabetically
		for (let artist in artistsMap) {
			artistsMap[artist].__albums = [...artistsMap[artist].__albums];
			artistsMap[artist].__albums.sort()

			// Sort the tracks by track number
			for (let i = 0; i < artistsMap[artist].__albums.length; i++) {
				const album = artistsMap[artist].__albums[i];
				artistsMap[artist][album].tracks.sort((a, b) => {
					if (typeof a.track == 'number' && typeof b.track == 'number')
						return a.track - b.track;

					// Prefer numbers over null/undefined
					else if (typeof a.track == 'number')
						return 1;
					else if (typeof b.track == 'number')
						return -1;

					// Neither track values are numbers, so order doesn't matter
					return 0;
				});
			}
		}



		const table = artistKeys.flatMap(artist => artistsMap[artist].__albums.flatMap(album => artistsMap[artist][album].tracks.map(trackData => {
			const song = `<p class="song_title">${trackData.title}</p><p class="song_extra">${artist} | ${album}${trackData.track ? ` | Track No. ${trackData.track}` : ''}</p>`;

			let img = '';
			if (artistsMap[artist][album].cover !== null)
				img = `<img src="./${COVER_DIR}/${encodeURIComponent(sanitize(`${artist}-${album}${artistsMap[artist][album].cover}`))}"></img>`;

			return `<tr><td>${img}</td><td>${song}</td></tr>`;
		}))).join('\n');

		// const table = fileData.map(data => {
		// 	const song  =   `<p class="song_title">
		// 				${data.title}
		// 			</p>
		// 			<p class="song_artist_album">
		// 				${data.artist} | ${data.album}${data.track.no ? ` | Track No. ${data.track.no}` : ''}
		// 			</p>`;

		// 	return `<tr><td>${data.cover}</td><td>${song}</td></tr>`;
		// }).join('');

		// Write the output playlist to an HTML file
		const htmlOutputDir = path.resolve(`${OUTPUT_DIR}${path.sep}index.html`);
		fs.writeFileSync(htmlOutputDir, `<html><body><table>${table}</table></body></html>`);

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
 * Gets the extension from the given mime type.
 * @param  {String} mime The mime type to process
 * @return {String}      The file extension associated with the given mime type.
 */
function getMediaExt(mime) {
	switch (mime) {
		case 'audio/aac':
			return '.aac';
		case 'application/x-abiword':
			return '.abw';
		case 'application/x-freearc':
			return '.arc';
		case 'video/x-msvideo':
			return '.avi';
		case 'application/vnd.amazon.ebook':
			return '.azw';
		case 'application/octet-stream':
			return '.bin';
		case 'image/bmp':
			return '.bmp';
		case 'application/x-bzip':
			return '.bz';
		case 'application/x-bzip2':
			return '.bz2';
		case 'application/x-csh':
			return '.csh';
		case 'text/css':
			return '.css';
		case 'text/csv':
			return '.csv';
		case 'application/msword':
			return '.doc';
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
			return '.docx';
		case 'application/vnd.ms-fontobject':
			return '.eot';
		case 'application/epub+zip':
			return '.epub';
		case 'application/gzip':
			return '.gz';
		case 'image/gif':
			return '.gif';
		case 'text/html':
			return '.html';
		case 'image/vnd.microsoft.icon':
			return '.ico';
		case 'text/calendar':
			return '.ics';
		case 'application/java-archive':
			return '.jar';
		case 'image/jpeg':
			return '.jpg';
		case 'text/javascript':
			return '.js';
		case 'application/json':
			return '.json';
		case 'application/ld+json':
			return '.jsonld';
		case 'audio/midi</code> <code>audio/x-midi':
			return '.mid';
		case 'audio/midi</code> <code>audio/x-midi':
			return '.midi';
		case 'text/javascript':
			return '.mjs';
		case 'audio/mpeg':
			return '.mp3';
		case 'video/mpeg':
			return '.mpeg';
		case 'video/mp4':
			return '.mp4';
		case 'application/vnd.apple.installer+xml':
			return '.mpkg';
		case 'application/vnd.oasis.opendocument.presentation':
			return '.odp';
		case 'application/vnd.oasis.opendocument.spreadsheet':
			return '.ods';
		case 'application/vnd.oasis.opendocument.text':
			return '.odt';
		case 'audio/ogg':
			return '.oga';
		case 'video/ogg':
			return '.ogv';
		case 'application/ogg':
			return '.ogx';
		case 'audio/opus':
			return '.opus';
		case 'font/otf':
			return '.otf';
		case 'image/png':
			return '.png';
		case 'application/pdf':
			return '.pdf';
		case 'application/x-httpd-php':
			return '.php';
		case 'application/vnd.ms-powerpoint':
			return '.ppt';
		case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
			return '.pptx';
		case 'application/vnd.rar':
			return '.rar';
		case 'application/rtf':
			return '.rtf';
		case 'application/x-sh':
			return '.sh';
		case 'image/svg+xml':
			return '.svg';
		case 'application/x-shockwave-flash':
			return '.swf';
		case 'application/x-tar':
			return '.tar';
		case 'image/tiff':
			return '.tif';
		case 'image/tiff':
			return '.tiff';
		case 'video/mp2t':
			return '.ts';
		case 'font/ttf':
			return '.ttf';
		case 'text/plain':
			return '.txt';
		case 'application/vnd.visio':
			return '.vsd';
		case 'audio/wav':
			return '.wav';
		case 'audio/webm':
			return '.weba';
		case 'video/webm':
			return '.webm';
		case 'image/webp':
			return '.webp';
		case 'font/woff':
			return '.woff';
		case 'font/woff2':
			return '.woff2';
		case 'application/xhtml+xml':
			return '.xhtml';
		case 'application/vnd.ms-excel':
			return '.xls';
		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
			return '.xlsx';
		case 'application/vnd.mozilla.xul+xml':
			return '.xul';
		case 'application/zip':
			return '.zip';
		case 'application/x-7z-compressed':
			return '.7z';
		default:
			return '.txt';
	}
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
