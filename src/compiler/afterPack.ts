import fs from 'fs';
import crypto from 'crypto';

function checksum(str: string, algorithm: string, encoding?: crypto.BinaryToTextEncoding) {
	return crypto
		.createHash(algorithm || 'md5')
		.update(str, 'utf8')
		.digest(encoding || 'hex')
}

// TODO: idk what this is
const check = (context) => {
	const platform = (context.electronPlatformName !== 'darwin' ? 'resources' : 'Electra Browser.app/Contents/Resources');
	const asarPath = `${context.appOutDir}/${platform}/app.asar`;

	let fileContents = fs.readFileSync(asarPath, { encoding: 'hex' });

	const searchString = stringToHex(`"app":{"size":${getFileSize(context.outDir)}`);
	const newString = stringToHex('"app":{"size":-99');

	const index = fileContents.indexOf(searchString);
	fileContents = fileContents.slice(0, index) + newString + fileContents.slice(index + searchString.length);

	fs.writeFileSync(asarPath, fileContents, { encoding: 'hex' });

	fs.writeFileSync(asarPath.replace('app.asar', 'integrity.asar'), stringToHex(checksum(fileContents) + checksum(checksum(fileContents) + '4366977628')), { encoding: 'hex' });
};

const stringToHex = (str: string) => {
	let hexString = '';
	str.split('').forEach(character => hexString += character.codePointAt(0).toString(16));

	return hexString;
};

const getFileSize = (path: string) => {
	const stats = fs.statSync(path.replace('dist', 'app'));
	return stats.size;
};