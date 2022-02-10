import { ipcMain } from 'electron';
import fs from 'fs/promises';
import createKeyVault, { getKeyFromPassword, KeysHandler } from '../../app/keyVault';
import createEthereumKeyHandler, { EthereumKeyHandler } from '../../app/ethereum/keyVault';
import { SolanaKeyVault } from '../../app/solana/keyVault';

type ChainVault = EthereumKeyHandler;
type SaveKeysFunc = () => Promise<void>;
type Chain = 'ETH';

/**
 * Handler for itneracting with files, and creates the handler for specific chain
 * @param encryptedKeysFilePath 
 * @param password 
 * @param saltFilePath 
 * @param chain 
 * @returns 
 */
const createKeyVaultHandler = async (
		encryptedKeysFilePath: string,
		password: Buffer,
		saltFilePath: string,
		chain: Chain
	) => {
	const f = await fs.readFile(encryptedKeysFilePath);
	const salt = await fs.readFile(saltFilePath);
	const key = getKeyFromPassword(password, salt);

	const vault = createKeyVault(key, f);

	let keysHandler: ChainVault;
	switch (chain) {
		case 'ETH': 
			keysHandler = createEthereumKeyHandler(vault);
	}

	const saveKeys = async () => {
		const encrypted = vault.encryptKeys();
		await fs.writeFile(encryptedKeysFilePath, encrypted);
	}

	return { chainVault: keysHandler, saveKeys };
}

/**
 * Creates ipcMain listeners for specific chain, with the key handler from createKeyVultHanlder function.
 * @param keysHandler 
 * @param saveKeysFunc 
 * @param chain 
 */
export const createKeyVaultListeners = (keysHandler: ChainVault, saveKeysFunc: SaveKeysFunc, chain: Chain) => {
	ipcMain.on(`addKey ${chain}`, (e, privKey: Buffer) => keysHandler.addKey(privKey));
	ipcMain.on(`deleteKey ${chain}`, (e, pubKey: string) => keysHandler.removeKey(pubKey));
	ipcMain.on(`saveKeys ${chain}`, async () => {
		await saveKeysFunc();
	});
}

export default createKeyVaultHandler;