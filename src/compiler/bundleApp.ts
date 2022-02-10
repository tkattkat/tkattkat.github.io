import bytenode from 'bytenode';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { transformAsync } from '@babel/core';
import del from 'del';

const ncc = require('@vercel/ncc');
const transformArrowFunctions = require('@babel/plugin-transform-arrow-functions');

const packageJSON = require('./package.json');

// Explain and fix whatever this is
const entryFile = './main.js';

const finalDir = './';

const excludeDeps = [
	...(packageJSON.dependencies ? Object.keys(packageJSON.dependencies) : []),
	...(packageJSON.devDependencies ? Object.keys(packageJSON.devDependencies) : []),
];

// TODO: going to have to fix these paths
function obfuscateApp() {
	console.log('Obfuscating app...');
	exec(`javascript-obfuscator ./main.js
		--output ./main.js
		--target node
		--compact true
		--control-flow-flattening false
		--dead-code-injection false
		--debug-protection false
		--debug-protection-interval false
		--disable-console-output true
		--identifier-names-generator hexadecimal
		--log false
		--rename-globals false
		--rotate-string-array true
		--self-defending false
		--string-array true
		--string-array-encoding rc4
		--string-array-threshold 1
		--unicode-escape-sequence false`, (error, stdout, stderr) => {
			exec(`javascript-obfuscator ./renderer.js
				--output ./renderer.js
				--target node
				--compact true
				--control-flow-flattening false
				--dead-code-injection false
				--debug-protection false
				--debug-protection-interval false
				--disable-console-output true
				--identifier-names-generator hexadecimal
				--log false --rename-globals false
				--rotate-string-array true
				--self-defending false
				--string-array true
				--string-array-encoding rc4
				--string-array-threshold 1
				--unicode-escape-sequence false`, (error, stdout, stderr) => {
					console.log('Obfuscated app.');
					compileBytenode();
			})
	});
}

async function bundleApp() {
	console.log('Building bundled app...');
	const res = await ncc(path.join(__dirname, entryFile), {
		cache: false,
		externals: excludeDeps,
		filterAssetBase: path.join(__dirname, path.dirname(entryFile)),
		minify: true,
		sourceMap: false,
		sourceMapBasePrefix: '../',
		sourceMapRegister: true,
		watch: false,
		v8cache: false,
		quiet: false,
		debugLog: false
	});

	// TODO: i think this compiles to the current folder, we want to compile to a dist or compiled folder
	const { code, map, assets } = res;
	try {
		await fs.opendir(path.join(__dirname, finalDir));
	} catch (err) {
		fs.mkdir(path.join(__dirname, finalDir));
	}

	await fs.writeFile(path.join(__dirname, finalDir, 'main.js'), code);
	for (let assetName in assets) {
		await fs.writeFile(path.join(__dirname, finalDir, assetName), assets[assetName].source);
	}
	console.log('Built bundled app.');
	removeArrowFunctions();
}

async function removeArrowFunctions() {
	console.log('Removing arrow functions...');
	const result = await transformAsync(path.join(__dirname, finalDir, 'main.js'), { plugins: [transformArrowFunctions] });
	if (result === null) {
		throw new Error('no result from transformAsync');
	}
	const code = result.code;
	if (code === null || code === undefined) {
		throw new Error('code not in result from transformAsync. Got: ' + JSON.stringify(transformAsync));
	}
	await fs.writeFile(path.join(__dirname, finalDir, 'main.js'), code);
	console.log('Removed arrow functions.');
	obfuscateApp();
}

async function compileBytenode() {
	console.log('Compiling app to bytenode...');
	bytenode.compileFile({
		filename: path.join(__dirname, finalDir, 'main.js'),
		compileAsModule: true,
		output: path.join(__dirname, finalDir, 'main.jsc')
	});
	console.log('Compiled app to bytenode.');
	await overrideMain();
}

async function overrideMain() {
	console.log('Overriding entry point in build...');
	await fs.writeFile(path.join(__dirname, finalDir, 'main.js'), `require('bytenode');\nmodule.exports = require('./main.jsc');`)
	console.log('Overrid entry point.');
	process.exit(0);
}

if (require.main === module) {
	bundleApp();
}