// wrapper for eth keyvault
import ethers from 'ethers';
import { KeyVault, KeysHandler, WalletNotFoundError } from '../keyVault';

export interface EthereumKeyHandler extends KeysHandler {
	getWallet(pubKey: string): ethers.Wallet;
	addKey(privKey: Buffer): ethers.Wallet;
}

const createEthereumKeyHandler = (vault: KeyVault): EthereumKeyHandler => {
	const wallets: Record<string, ethers.Wallet> = {};
	const privateKeys = vault.getKeys();

	for (const pk of privateKeys) {
		const w = new ethers.Wallet(pk);
		wallets[w.publicKey] = w;
	}

	const getWallets = () => Object.keys(wallets);

	const getWallet = (pubKey: string) => {
		const w = wallets[pubKey];
		if (w === undefined) {
			throw new WalletNotFoundError(pubKey);
		}

		return w;
	}

	const addKey = (privKey: Buffer) => {
		const w = new ethers.Wallet(privKey);
		wallets[w.publicKey] = w;
		vault.addKey(privKey);
		return w;
	}

	const removeKey = (pubKey: string) => {
		if (wallets[pubKey] === undefined) return;
		delete wallets[pubKey];
	}

	return {
		getWallets,
		getWallet,
		addKey,
		removeKey,
	}
}

export default createEthereumKeyHandler;