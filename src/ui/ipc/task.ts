import {
	BrowserWindow,
	ipcMain,
	Notification
} from 'electron';
import Task, { setStatusFunc, setRenderMenuFunc } from '../../app/task';
import fs from 'fs/promises';
import logger from '../../app/logger';
import { ProfilesHandler } from './profiles';
import { ProfileNotFoundError } from '../../app/profile';
import path from 'path';
import { EthereumKeyHandler } from '../../app/ethereum/keyVault';

export interface TaskHandler {
	getTask(id: string): Task;
	getTasks(): Record<string, Task>;
	deleteTask(id: string): void;
	createTask(task: Task): void;
	saveTasks(): Promise<void>;
	startTask(id: string, setStatus: setStatusFunc, setRenderMenuFunc: setRenderMenuFunc): Promise<void>;
	stopTask(id: string): Promise<void>;
}

export const createTaskHandler = async (
		taskFilePath: string,
		profiles: ProfilesHandler,
		ethChainVault: EthereumKeyHandler
	): Promise<TaskHandler> => {
	const f = await fs.readFile(taskFilePath);
	const tasks: Record<string, Task> = JSON.parse(f.toString());

	const getTask = (id: string) => tasks[id];
	const getTasks = () => tasks;

	const deleteTask = (id: string) => {
		if (tasks[id] === undefined) return;
		delete tasks[id];
	};

	const createTask = (task: Task) => tasks[task.id] = task;

	const saveTasks = async () => {
		await fs.writeFile(taskFilePath, JSON.stringify(tasks, null, 2));
	}

	const stopTask = async (id: string) => {
		const task = tasks[id];
		if (task === undefined) {
			logger.debug(`task ${id} does not exist in tasks: ${tasks}`);
			return;
		};

		try {
			if (task.client === undefined) {
				logger.debug(`task ${id} to stop, but has not started`);
				return;
			}

			await task.client.stop();
			task.stopped = true;
		} catch (err) {
			logger.error(`error on stopping task: ${id}`);
		}
	}

	const startTask = async (
		id: string,
		setStatus: setStatusFunc,
		setRenderMenuFunc: setRenderMenuFunc
	) => {
		const t = tasks[id];
		const profile = profiles.getProfile(id);
		if (profile === null) {
			throw new ProfileNotFoundError(id);
		}
		t.profileInfo = profile;

		if (t.siteName === 'Mint' || t.siteName === 'MintParam') {
			const wallet = ethChainVault.getWallet(profile.pubkey);

			switch (t.siteName) {
				case 'Mint': 
					t.client = new MintClient(task); break;
				case 'MintParam':
					t.client = new ParamMintClient(task); break;
				default: t.client = new MintClient(task);
			}
	
		}

		t.setStatus = (status) => {
			t.client.logInfo(status);
			setStatus(status);
		};
		t.client.setRenderMenu = setRenderMenuFunc;

		await t.client.start();
	}

	return {
		getTask,
		getTasks,
		deleteTask,
		createTask,
		saveTasks,
		stopTask,
		startTask,
	}
}

export const createTaskListeners = (mainWindow: BrowserWindow, handler: TaskHandler) => {
	ipcMain.on('createTask', (e, task: Task) => {
		logger.info(`creaated task: ${task.id}`);
		handler.createTask(task);
	});

	ipcMain.on('saveTasks', async (e) => {
		await handler.saveTasks();
	});

	ipcMain.on('startTask', async (e, id: string) => {
		await handler.startTask(id, () => {
			mainWindow.webContents.send('updateStatus', {
				id,
				status
			});
		}, () => { mainWindow.webContents.send('render::menu') });
	});

	ipcMain.on('deleteTask', async (e, id: string) => {
		await handler.stopTask(id);
		handler.deleteTask(id);
	});

	ipcMain.on('deleteAllTasks', async () => {
		const tasks = handler.getTasks();
		const promises: Promise<void>[] = [];

		for (const id of Object.keys(tasks)) {
			promises.push(handler.stopTask(id));
			handler.deleteTask(id);
		}
		await Promise.all(promises);
	});

	ipcMain.on('stopAllTasks', async () => {
		const tasks = handler.getTasks();
		const promises: Promise<void>[] = [];

		for (const id of Object.keys(tasks)) {
			promises.push(handler.stopTask(id));
		}
		await Promise.all(promises);
		logger.debug('stopped all tasks');
	});

	ipcMain.on('startAllTasks', async () => {
		const tasks = handler.getTasks();
		const promises: Promise<void>[] = [];

		for (const id of Object.keys(tasks)) {
			promises.push((async () => {
				const task = await handler.startTask(id, () => {
					mainWindow.webContents.send('updateStatus', {
						id,
						status
					});
				}, () => { mainWindow.webContents.send('render::menu') });
			})());
		}
		await Promise.all(promises);
		logger.debug('started all tasks');
	});

	ipcMain.on('send-notification', (e, { status, id }) => {
		const task = handler.getTask(id);
		const notif = new Notification({
			title: `${task.siteName}`,
			body: `Task [${id}] ${status}!`,
			silent: true,
			timeoutType: 'never',
			icon: path.join(__dirname, '..', 'assets', 'icon.png')
		});
		notif.show();
		setTimeout(notif.close.bind(notif), 4000); // bind notif so we dont lose the reference here;
	});
}
