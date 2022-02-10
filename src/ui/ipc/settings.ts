import fs from 'fs/promises';
import { app, ipcMain, Settings } from 'electron';
import path from 'path';

const appDataPath = app.getPath('userData');
const filepathSettings = path.join(appDataPath, 'settings.json');

export const createSettingsListeners = () => {
	ipcMain.on('saveSettings', async (e, { monitor, splashSound, timeout, webhook, password }) => {
		const f = await fs.readFile(filepathSettings, 'utf8');
		const currentSettings: Settings = JSON.parse(f);
		const settings = {
			...currentSettings,
			monitor,
			splashSound,
			timeout,
			webhook,
			password
		};
		await fs.writeFile(filepathSettings, JSON.stringify(settings, null, 2))
	});
}
