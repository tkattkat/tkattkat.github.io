export default interface Settings {
	timeout: number;
	monitor: number;
	webhook: string;
	splashSound: boolean;
	password: string;
	autoSolve: AutoSolve | null;
	'2Captcha': string | null;
}

interface AutoSolve {
	userAPIKey: string;
	userAccessToken: string;
}