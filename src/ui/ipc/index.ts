import { 
	app,
	BrowserWindow,
	Menu,
	MenuItemConstructorOptions,
	MenuItem,
	ipcMain,
	shell,
	ipcRenderer,
} from 'electron';
import * as remoteMain from '@electron/remote/main';
import path from 'path';
import logger from '../../app/logger';
import fs from 'fs/promises';
import { stringToHex } from './utils';
import axios from 'axios';
import { activateKey } from '../../app/api';
import { createTaskHandler, createTaskListeners, TaskHandler } from './task';
import { createProfileListeners, createProfilesHandler } from './profiles';
import createKeyVaultHandler, { createKeyVaultListeners } from './keyVault';
import { EthereumKeyHandler } from '../../app/ethereum/keyVault';

const packageJSON = require('../../../package.json');
const devTools = process.argv.includes('--devTools');

let activationPoll: ReturnType<typeof setInterval>;
let menu: Menu;
let mainWindow: BrowserWindow;
let activationWindow: BrowserWindow;
let taskHandler: TaskHandler;
const appDataPath = app.getPath('userData');

/**
 * Checks to make sure all bot files, such as logs, settings, etc exists
 * If they don't exist make them.
 */
const checkFilesExists = async () => {
	try {
		await fs.access(appDataPath);
	} catch (err) {
		logger.info('creating appData directory');
		try {
			await fs.mkdir(appDataPath);
		} catch (err) {
			logger.error(`unable to create app data folder: ${err}`);
			throw new Error(`unable to create app data folder: ${err}`);
		}
	}
	logger.debug(`appDataPath: ${appDataPath}`);
	
	const dirpathLogs = path.join(appDataPath, 'logs');
	try {
		await fs.access(dirpathLogs);
	} catch (err) {
		logger.info('creating logs directory');
		try {
			await fs.mkdir(dirpathLogs);
		} catch (err) {
			logger.error(`unable to create logs folder: ${err}`);
			throw new Error(`unable to create logs folder: ${err}`);
		}
	}

	const filepathSettings = path.join(appDataPath, 'settings.json');
	try {
		await fs.access(filepathSettings);
	} catch (err) {
		logger.info('creating logs directory');
		try {
			await fs.writeFile(filepathSettings, JSON.stringify({}, null, 2));
		} catch (err) {
			logger.error(`unable to create settings file: ${err}`);
			throw new Error(`unable to create settings file: ${err}`);
		}
	}

	const filepathAccounts = path.join(appDataPath, 'accounts.json');
	try {
		await fs.access(filepathAccounts);
	} catch (err) {
		logger.info('creating accounts file');
		try {
			await fs.writeFile(filepathAccounts, JSON.stringify([], null, 2));
		} catch (err) {
			logger.error(`unable to create accounts file: ${err}`);
			throw new Error(`unable to create accounts file: ${err}`);
		}
	}

	// const filepathProxies = path.join(appDataPath, 'proxies.txt');
	const filepathProfiles = path.join(appDataPath, 'profiles.json');
	try {
		await fs.access(filepathProfiles);
	} catch (err) {
		logger.info('creating profiles file');
		try {
			await fs.writeFile(filepathProfiles, JSON.stringify({}, null, 2));
		} catch (err) {
			logger.error(`unable to create profiles file: ${err}`);
			throw new Error(`unable to create profiles file: ${err}`);
		}
	}

	const filepathTasks = path.join(appDataPath, 'tasks.json');
	try {
		await fs.access(filepathTasks);
	} catch (err) {
		logger.info('creating tasks file');
		try {
			await fs.writeFile(filepathTasks, JSON.stringify({}, null, 2));
		} catch (err) {
			logger.error(`unable to create tasks file: ${err}`);
			throw new Error(`unable to create tasks file: ${err}`);
		}
	}
}

function renderMenu() {
	// Cookies for google accounts?
	// let cookieArray = JSON.parse(fs.readFileSync(filepathCookies, 'utf8'));
	// let cookieSites = global.cookieSites;
	// let harvesterSubMenu = cookieSites.map(s => {
	// 	let cookieCount;
	// 	cookieCount = cookieArray.filter(({ site, expiry }) => expiry >= Date.now() && site.toLowerCase() === s).length;
	// 	let status = {
	// 		label: `Current ${s} cookies: ${cookieCount}`
	// 	};
	// 	return cookieCount > 1 ? status : undefined;
	// }).filter(e => !!e);

	const template:  (MenuItem | MenuItemConstructorOptions)[] = [
		{
			label: "Electra",
			submenu: [
				{ label: `Version ${packageJSON['version']}` },
				{ label: "Quit", accelerator: "Command+Q", click: function () { app.quit(); } }
			]
		}, {
			label: "Edit",
			submenu: [
				{ label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
				{ label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
				{ type: "separator" },
				{ label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
				{ label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
				{ label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
				{ label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll" }
			]
		}, {
			label: "Captcha",
		}
	];

	// accountMap.forEach((value, key) => {
	// 	template[2].submenu[0].submenu.push({
	// 		label: value.name,
	// 		click: openAccount.bind(null, value)
	// 	});
	// });
	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

const loadActivation = () => {
	logger.info('loading activation window');
	activationWindow = new BrowserWindow({
		width: 650,
		height: 350,
		frame: false,
		transparent: true,
		resizable: false,
		show: false,
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false,
		}
	})
	remoteMain.enable(activationWindow.webContents);

	activationWindow.loadURL(`file://${path.join(__dirname, './src/activation.html')}`)

	activationWindow.on('ready-to-show', () => {
		activationWindow.show();
		logger.info('loaded activation window');
	})
}

const main = async () => {
	await checkFilesExists();
}

if (require.main === module) {
	main();
}

interface ActivationResponse {
	success: boolean;
	discord_id: string;
}

app.on('ready', async () => {
	if (process.env.HTTPS_PROXY || process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
		return process.exit();
	}
	if (process.argv.join(' ').includes('--inspect')) {
		return process.exit();
	}
	const appDataPath = app.getPath('userData');
	const currentAppDirectory = app.getAppPath();

	if (currentAppDirectory.includes('asar')) {
		const originalFs = require('original-fs');
		const crypto = require('crypto');
		function checksum(str: string, algorithm = 'md5', encoding = 'hex') {
			return crypto
				.createHash(algorithm)
				.update(str, 'utf8')
				.digest(encoding)
		}
		const fileContents = originalFs.readFileSync(currentAppDirectory, { encoding: 'hex' });
		const integrityChecksum = originalFs.readFileSync(currentAppDirectory.replace('app.asar', 'integrity.asar'), { encoding: 'hex' });
		const asarChecksum = checksum(fileContents);
		if (stringToHex(asarChecksum + checksum(asarChecksum + '4366977628')) !== integrityChecksum) {
			// Failed asar integrity check
			logger.error('failed integrity check');
			return process.exit();
		}
	}
  renderMenu();

	/*
		Check if user has stored activation token
		If user doesn't, load activation page
		TODO: clean this up
	*/
	try {
		// makes sure file exists and can access
		await fs.access(path.join(appDataPath, 'activation.token'));
		const activationToken = fs.readFile(path.join(appDataPath, 'activation.token'), 'utf8').toString();

		try {
			const resp = await axios.get(`https://poseidon.solutions/api/v1/activations/${activationToken}`, {
				headers: {
					'Authorization': 'Bearer ak_g9ALrprQpCQgKg99iNmy'
				}
			});
			const { success, discord_id }: ActivationResponse = JSON.parse(resp.data);
			if (!success) throw new Error('success false on activating key');

			logger.info('activation success');
			loadMainWindow();
			logger.debug(`discord id: ${discord_id}`);
		} catch (err) {
			logger.debug(`error on sending activation request to server: ${err}`);
			loadActivation();
		}
	} catch (err) {
		logger.debug(`activation.token does not exist, ${err}`);
		loadActivation();
	}

	const filepathProfiles = path.join(appDataPath, 'profiles.json');
	const profilesHandler = await createProfilesHandler(filepathProfiles);
	createProfileListeners(profilesHandler);


	const filepathTasks = path.join(appDataPath, 'tasks.json');

	// get vault password somehow
	// all vaults are protected by one password
	// TODO: render menu, or prompt user for a password
	let ethVault: EthereumKeyHandler;
	ipcMain.on('unlock', async (e, password: Buffer) => {
		try {
			const saltFilePath = path.join(appDataPath, 'password.SALT');
			const ethVaultFile = path.join(appDataPath, 'eth_keys.ENCRYPTED');
			const { chainVault: ethChainVault, saveKeys: ethSaveKey } = await createKeyVaultHandler(ethVaultFile, password, saltFilePath, 'ETH');
			createKeyVaultListeners(ethVault, ethSaveKey, 'ETH');
			ethVault = ethChainVault;
	
			// on recieve these events close the password window
			ipcRenderer.send('unlock successful');
			taskHandler = await createTaskHandler(filepathTasks, profilesHandler, ethVault);
			createTaskListeners(mainWindow, taskHandler);
		} catch (err) {
			ipcRenderer.send('unlock error', err);
		}
	});
});

app.on('will-quit', async () => {
	// clear activation poll
	clearInterval(activationPoll);
	logger.debug('cleared activation poll');

	// save tasks
	const filepathTasks = path.join(appDataPath, 'tasks.json');

	await fs.writeFile(filepathTasks, JSON.stringify(getTaskData(), null, 2));
	logger.info('tasks saved');
});

// TODO: change this such that it returns the if key is active or not
const checkActivationStatus = async () => {
  logger.debug('checking actiavtion status');
	try {
		// makes sure file exists and can access
		await fs.access(path.join(appDataPath, 'activation.token'));
		const activationToken = fs.readFile(path.join(appDataPath, 'activation.token'), 'utf8').toString();

		try {
			const resp = await axios.get(`https://poseidon.solutions/api/v1/activations/${activationToken}`, {
				headers: {
					'Authorization': 'Bearer ak_g9ALrprQpCQgKg99iNmy'
				}
			});
			const { success, discord_id }: ActivationResponse = JSON.parse(resp.data);
			if (!success) throw new Error('success false on activating key');

			logger.info('activation success');
			loadMainWindow();
			logger.debug(`discord id: ${discord_id}`);
		} catch (err) {
			logger.debug(`error on sending activation request to server: ${err}`);
			loadActivation();
		}
	} catch (err) {
		logger.debug(`activation.token does not exist, ${err}`);
		app.quit();
	}
}

ipcMain.on('openMenu', () => {
  menu.popup();
})

const loadMainWindow = () => {
	activationPoll = setInterval(checkActivationStatus, 60 * 1000 * 5); // check every 5 mins
	logger.debug('activation status poll set');
	mainWindow = new BrowserWindow({
		width: 1650,
		height: 1120,
		frame: false,
		transparent: true,
		resizable: true,
		show: false,
		webPreferences: {
			devTools,
			nodeIntegration: true,
			contextIsolation: false,
			webSecurity: false
		},
		minHeight: 670,
		minWidth: 1100
	});
	remoteMain.enable(mainWindow.webContents);

	mainWindow.loadURL(`file://${path.join(__dirname, './src/index.html')}`)

	if (devTools) mainWindow.webContents.openDevTools();

	mainWindow.on('ready-to-show', async () => {
		mainWindow.show();
		logger.debug('presenting main window');
		const filepathSettings = path.join(appDataPath, 'settings.json');
		const filepathProfiles = path.join(appDataPath, 'profiles.json');
	
		mainWindow.webContents.send('loadSettings', JSON.parse(await fs.readFile(filepathSettings, 'utf8')));
		mainWindow.webContents.send('loadProfiles', JSON.parse(await fs.readFile(filepathProfiles, 'utf8')));
		// init autosolve here
		// initAutoSolve();

		// init tasks from file
		const tasks = taskHandler.getTasks();
		ipcRenderer.send('createTasks', tasks);
	});
}

const showLogs = async () => {
	const dirpathLogs = path.join(appDataPath, 'logs');

	try {
		await shell.openPath(dirpathLogs);
	} catch (err) {
		logger.error(`opening shell to logs: ${err}`);
	}
};

ipcMain.on('activateKey', async (e, key: string) => {
	try {
		const activation_token = await activateKey(key);
		activationWindow.webContents.send('activateResponse', {
			success: true,
			msg: 'Key is valid! Opening bot...'
		});
		await fs.writeFile(path.join(appDataPath, 'activation.token'), activation_token);
		loadMainWindow();
		activationWindow.close();
	} catch (err) {
		activationWindow.webContents.send('activateResponse', {
			success: false,
			msg: `Key is invalid or already activated. ${err}`
		});
	}
})

process.on('uncaughtException', err => {
	logger.error(err);
	console.error(err);
	if (err.name === 'AssertionError') {
		console.log('Assertion error...', err); // usually when request messes up (tunnel-agent)
	}
});
