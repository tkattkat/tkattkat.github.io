import { ipcMain } from 'electron';
import fs from 'fs/promises';
import Profile from '../../app/profile';

export interface ProfilesHandler {
	getProfiles(): Profile[];
	getProfile(name: string): Profile | null;
	addProfile(profile: Profile): void;
	deleteProfile(name: string): void;
	saveProfiles(profiles: Profile[]): Promise<void>;
}

export const createProfilesHandler = async (profilesFilePath: string): Promise<ProfilesHandler> => {
	const f = await fs.readFile(profilesFilePath);
	let profiles: Profile[] = JSON.parse(f.toString());

	const getProfiles = () => profiles;

	const getProfile = (name: string) => {
		const p = profiles.find(p => p.name === name);
		if (p === undefined) return null;
		return p;
	}

	const addProfile = (p: Profile) => profiles.push(p);

	const deleteProfile = (name: string) => {
		profiles = profiles.filter(p => p.name !== name);
	}

	const saveProfiles = async (profiles: Profile[]) => {
		await fs.writeFile(profilesFilePath, JSON.stringify(profiles, null, 2));
		profiles = profiles;
	}

	return {
		getProfiles,
		getProfile,
		addProfile,
		deleteProfile,
		saveProfiles,
	}
}

export const createProfileListeners = (handler: ProfilesHandler) => {
	ipcMain.on('updateProfiles', async (e, profiles: Profile[]) => {
		await handler.saveProfiles(profiles);
	})
}