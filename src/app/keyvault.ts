import crypto from 'crypto';

const BLOCK_CIPHER = 'aes-256-gcm';

// https://stackoverflow.com/a/53573115/8327613
const ALGORITHM = {
  // GCM is an authenticated encryption mode that not only provides confidentiality but also provides integrity in a secured way
  BLOCK_CIPHER: "aes-256-gcm",
  // 128 bit auth tag is recommended for GCM
  AUTH_TAG_BYTE_LEN: 16,
  // NIST recommends 96 bits or 12 bytes IV for GCM to promote interoperability, efficiency, and simplicity of design
  IV_BYTE_LEN: 12,
  // NOTE: 256 (in algorithm name) is key size (block size for AES is always 128)
  KEY_BYTE_LEN: 32,
  // to prevent rainbow table attacks
  SALT_BYTE_LEN: 16
};

export const getSalt = () => crypto.randomBytes(ALGORITHM.SALT_BYTE_LEN);

export const getKeyFromPassword = (password: Buffer, salt: Buffer) => {
	return crypto.scryptSync(password, salt, ALGORITHM.KEY_BYTE_LEN);
}

export const encrypt = (messageText: Buffer, key: Buffer) => {
	const iv = crypto.randomBytes(ALGORITHM.IV_BYTE_LEN);
	const cipher = crypto.createCipheriv(BLOCK_CIPHER, key, iv);
	let encryptedMessage = cipher.update(messageText);
	encryptedMessage = Buffer.concat([encryptedMessage, cipher.final()]);
	return Buffer.concat([iv, encryptedMessage, cipher.getAuthTag()]);
}

function decrypt(ciphertext: Buffer, key: Buffer) {
	const authTag = ciphertext.slice(-16);
	const iv = ciphertext.slice(0, 12);
	const encryptedMessage = ciphertext.slice(12, -16);
	const decipher = crypto.createDecipheriv(BLOCK_CIPHER, key, iv);
	decipher.setAuthTag(authTag);
	const messagetext = decipher.update(encryptedMessage);
	return Buffer.concat([messagetext, decipher.final()]);
}

/**
 * Stores wallets and accessors, wrapped to each chain
 */
export interface KeysHandler {
	getWallets: () => string[];
	addKey: (privKey: Buffer) => unknown;
	removeKey(pubKey: string): void;
}

// interacts with storage of private keys
export interface KeyVault {
	getKeys(): Buffer[];
	addKey(key: Buffer): void;
	removeKey(key: Buffer): void;
	encryptKeys(): Buffer;
}

/**
 * @description Safe password manager
 * @param key Buffer with vault decrypter
 * @param encryptedVault Buffer with passwords
 */
const createKeyVault = (key: Buffer, encryptedVault: Buffer): KeyVault => {
	let vault = decrypt(encryptedVault, key);

	// splits buffer and initializes keys
	let keys: Buffer[] = [];
	let i = 0;
		while (i < vault.length) {
			const newline = vault.slice(i).findIndex((v, i, o) => v === '\n'.charCodeAt(0));
			if (newline === -1) break;

			const b = vault.slice(i, i + newline);
			keys.push(b);
			i = i + newline + 1;
		}

	const getKeys = (): Buffer[] =>  {
		return keys;
	}

	const addKey = (key: Buffer) => {
		keys.push(key);
	}

	const removeKey = (key: Buffer) => {
		keys = keys.filter((v => !(v.equals(key))));
	}

	// save to file
	const encryptKeys = (): Buffer => {
		let message = Buffer.from('');
		for (const k of keys) {
			message = Buffer.concat([message, k, Buffer.from('\n')]);
		}

		return encrypt(message, key);
	}

	return {
		getKeys,
		addKey,
		removeKey,
		encryptKeys
	};
}

export default createKeyVault;

export class WalletNotFoundError extends Error {
	constructor(pubkey: string) {
		super(`can not find wallet ${pubkey} in vault`);
	}
}