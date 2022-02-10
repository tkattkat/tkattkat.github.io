// this file is for the poseidon API
import axios from 'axios';
import logger from './logger';
import machineId from 'node-machine-id';
import os from 'os';

class UnableToVerifyKeyError extends Error {
	constructor(key: string) {
		super(`unable to verify ${key}`);
	}
}

class BadKeyFormatError extends Error {
	constructor(key: string) {
		super(`${key} is not in the format of {5}-{5}-{5}-{5}`);
	}
}

interface ActivateKeyResponse {
	success: boolean;
	activation_token: string;
}

export const activateKey = async (key: string) => {
	if (!(/.{5}-.{5}-.{5}-.{5}/.test(key))) {
		throw new BadKeyFormatError(key);
	}

	try {
		const hwid = await machineId.machineId();
		const deviceName = os.hostname();

		const resp = await axios.post('https://poseidon.solutions/api/v1/activations', {
			key,
			activation: {
				hwid,
				device_name: deviceName
			}
		}, {
			headers: {
				'Authorization': 'Bearer ak_g9ALrprQpCQgKg99iNmy'
			}
		});
		const body: ActivateKeyResponse = JSON.parse(resp.data);
		if (!body.success || !body.activation_token) {
			throw new UnableToVerifyKeyError('bad response');
		}
		return body.activation_token;
	} catch (err) {
		if (!(err instanceof Error)) {
			logger.error(`non Error error thrown: ${err}`);
			throw err;
		}

		logger.error(`got error: ${err.name}`);
		if (axios.isAxiosError(err)) {
			// TODO: handle key activation errors
		}

		throw err;
	}
}