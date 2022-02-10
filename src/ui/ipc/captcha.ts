// import {
// 	app,
// 	ipcMain,
// 	BrowserWindow
// } from 'electron';
// import * as remoteMain from '@electron/remote/main';
// import path from 'path';
// import fs from 'fs/promises';
// import logger from '../../app/logger';
// import Settings from '../../app/settings';

// const AutoSolve = require('autosolve-client');
// const appDataPath = app.getPath('userData');
// const filepathSettings = path.join(appDataPath, 'settings.json');
// const devTools = process.argv.includes('--devTools');

// const initAutoSolve = async () => {
// 	logger.info('init autosolve');
// 	const f = await fs.readFile(filepathSettings, 'utf8');
// 	const settings: Settings = JSON.parse(f);

// 	if (settings.autoSolve === null) return logger.error(`autosolve ${settings.autoSolve}`);
// 	if (settings.autoSolve.userAPIKey === null || settings.autoSolve.userAccessToken === null)
// 		return logger.error(`autosolve missing user credentials`);

// 	logger.info(settings.autoSolve);
// 	const autoSolve = AutoSolve.getInstance({
// 		"accessToken": settings.autoSolve.userAccessToken,
// 		"apiKey": settings.autoSolve.userAPIKey,
// 		"clientKey": "Electra-1a06a7d7-6ac3-42b3-9397-f2003ee72188",
// 		"shouldAlertOnCancel": true,
// 		"debug": true
// 	});

// 	autoSolve.init().then(() => {
// 		autoSolve.cancelAllRequests().then(() => {
// 			logger.info('cleared outstanding autosolve requests');

// 			autoSolve.ee.on('AutoSolveResponse', (response: any) => {
// 				logger.info('autosolve data received');
// 				logger.debug(response);
// 				const data = JSON.parse(response);
// 				const { token, createdAt, taskId } = data;
// 				// the data received should be sent to the appropriate task
// 				tasks[taskId].client.recaptcha = { token, createdAt }; // the corresponding task will now have a recaptcha object containing the timestamp and token value
// 			});

// 			autoSolve.ee.on('AutoSolveResponse_Cancel', (data: any) => {
// 				logger.info('autosolve cancelled');
// 				logger.debug(data);
// 			});

// 			autoSolve.ee.on('AutoSolveError', (data: any) => {
// 				logger.error('autosolve error', data);
// 			});

// 			logger.info('autosolve init complete');
// 		}).catch((err: any) => {
// 			logger.error('failed to cancel all requests');
// 		});
// 	}).catch((err: any) => {
// 		logger.error('failed to init autosolve');
// 	});
// }

// const loadAutoSolveSettings = () => {
// 	logger.info('loading autosolve settings window');
// 	const autoSolveSettings = new BrowserWindow({
// 		width: 450,
// 		height: 300,
// 		frame: false,
// 		transparent: true,
// 		resizable: false,
// 		show: false,
// 		webPreferences: {
// 			devTools,
// 			nodeIntegration: true,
// 			contextIsolation: false,
// 			// enableRemoteModule: true,
// 			webSecurity: false
// 		}
// 	});
// 	remoteMain.enable(autoSolveSettings.webContents);
// 	autoSolveSettings.loadURL(`file://${path.join(__dirname, './src/autosolve.html')}`);

// 	autoSolveSettings.on('ready-to-show', () => {
// 		autoSolveSettings.show();
// 		logger.info('loaded autosolve settings window');
// 	});

// 	autoSolveSettings.on('closed', () => {
// 		// here we should check and see the settings and if not empty lets try and init the autosolve
// 		initAutoSolve();
// 	});

// 	// global.autoSolveSettings.webContents.openDevTools();
// };

// const load2CaptchaSettings = () => {
// 	logger.info('loading 2captcha settings window');
// 	const twoCaptchaSettings = new BrowserWindow({
// 		width: 450,
// 		height: 300,
// 		frame: false,
// 		transparent: true,
// 		resizable: false,
// 		show: false,
// 		webPreferences: {
// 			devTools,
// 			nodeIntegration: true,
// 			contextIsolation: false,
// 			webSecurity: false
// 		}
// 	});
// 	remoteMain.enable(twoCaptchaSettings.webContents);

// 	twoCaptchaSettings.loadURL(`file://${path.join(__dirname, './src/2captcha.html')}`);

// 	twoCaptchaSettings.on('ready-to-show', () => {
// 		twoCaptchaSettings.show();
// 		logger.info('loaded 2captcha setting window');
// 	});
// };

// async function loadGoogle(window) {
//   try {
//     await window.loadURL('https://www.google.com/');
//     return;
//   } catch (e) {
//     return loadGoogle(window);
//   }
// }

// async function loadGoogleSearch(window) {
//   try {
//     await window.loadURL(`https://www.google.com/search?sxsrf=ALeKk01yfumCpM5gdDlJIppFmjvwo_7vmg%3A1590588807593&source=hp&ei=h3XOXoHIIaWO9PwP5IadyAU&q=youtube videos&oq=asd&gs_lcp=CgZwc3ktYWIQAzIECCMQJzIFCAAQkQIyAggAMgIIADICCAAyAggAMgIIADICCAAyAggAMgIIADoICAAQgwEQkQI6BQgAEIMBOgQIABAKOgcIIxDqAhAnUOQOWMFdYMFfaAVwAHgBgAFqiAGJBJIBAzUuMZgBAKABAaoBB2d3cy13aXqwAQo&sclient=psy-ab&ved=0ahUKEwjBp-6GndTpAhUlB50JHWRDB1kQ4dUDCAk&uact=5`);
//     return;
//   } catch (e) {
//     return loadGoogleSearch(window);
//   }
// }

// async function loadHarvesterURL(window, url) {
//   try {
//     await window.loadURL(url);
//     return;
//   } catch (e) {
//     return loadHarvesterURL(window, url);
//   }
// }
// 
// const createCaptchaSolver = async (partition = "", _url = "", sess) => {
// 	logger.info('launching captcha solver');
// 	logger.debug({ partition, url: _url, sess });

// 	return new Promise(async (resolve) => {
// 		// need to make sure the session proxy is set before hand
// 		if (!!partition) {
// 			let data = accountMap.get(partition);
// 			if (!!data.proxy) {
// 				let formattedProxy = formatProxy(data.proxy);
// 				if (!!formattedProxy) setSessionProxy(formattedProxy, data.id);
// 			};
// 		};
// 		let b = new BrowserWindow({
// 			width: 400,
// 			height: 600,
// 			backgroundColor: '#1C3B53',
// 			resizable: false,
// 			minimizable: false,
// 			maximizable: false,
// 			// frame: false,
// 			autoHideMenuBar: true,
// 			title: 'Electra Captcha Solver',
// 			parent: global.mainWindow,
// 			webPreferences: {
// 				devTools,
// 				nodeIntegration: true,
// 				contextIsolation: false,
// 				enableRemoteModule: true,
// 				allowRunningInsecureContent: true,
// 				javascript: true,
// 				session: sess || (!!partition ? session.fromPartition(partition) : session.defaultSession)
// 			},
// 			show: false
// 		});
// 		b.removeMenu();
// 		b.on('close', () => {
// 			global.captchaSolvers = global.captchaSolvers.filter(s => s.id != b.id);
// 			global.captchaSolversIndex = 0;
// 		});
// 		b.on('closed', () => {
// 			b = null;
// 		});
// 		if (devTools) b.webContents.openDevTools();
// 		b.webContents.on('login', (e, { url }, { isProxy, scheme, host, port, realm }, cb) => {
// 			if (isProxy) {
// 				log.info('proxy login requested');
// 				log.debug(url);
// 				let proxy = new URL(formattedProxy);
// 				cb(proxy.username, proxy.password);
// 			} else {
// 				cb();
// 			};
// 		});
// 		b.webContents.session.protocol.interceptBufferProtocol('http', (req, cb) => {
// 			if (req.url.includes('supremenewyork.com')) {
// 				cb({
// 					"data": Buffer.from(fs.readFileSync(path.join(__dirname, 'src', 'captcha.html')))
// 				});
// 			} else {
// 				cb({});
// 			};
// 		});
// 		await loadGoogle(b);
// 		await wait(Math.floor(Math.random() * 150) + 400);
// 		await loadGoogleSearch(b);
// 		await wait(Math.floor(Math.random() * 150) + 400);
// 		if (!!_url) {
// 			let u = new URL(_url);
// 			u.protocol = 'http';
// 			await loadHarvesterURL(b, u.href);
// 		} else {
// 			await loadHarvesterURL(b, 'http://www.supremenewyork.com/mobile/');
// 		};
// 		b.show();
// 		captchaSolvers.push(b);
// 		resolve(b);
// });
// };
// 
// const initCaptchaListeners = async () => {
// 	ipcMain.on('openSolver', (e, data) => {
// 		createCaptchaSolver(data.id, data.site, e.sender.session);
// 	});

// 	ipcMain.on('get2CaptchaSettings', async (e) => {
// 		console.log('renderer requested 2Captcha settings');
// 		const f = await fs.readFile(filepathSettings, 'utf8')
// 		const currentSettings: Settings = JSON.parse(f);
// 		e.reply('received2CaptchaSettings', currentSettings['2Captcha']);
// 	});
	
// 	ipcMain.on('save2CaptchaSettings', async (e, apiKey) => {
// 		const f = await fs.readFile(filepathSettings, 'utf8');
// 		const currentSettings = JSON.parse(f);
// 		const settings = {
// 			...currentSettings,
// 			'2Captcha': apiKey
// 		};
// 		await fs.writeFile(filepathSettings, JSON.stringify(settings, null, 2));
// 		// lets send back a reply so that we know when it is safe to close it
// 		e.reply('saved2CaptchaSettings');
// 	});
// }
