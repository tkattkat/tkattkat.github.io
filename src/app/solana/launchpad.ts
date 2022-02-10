import * as anchor from '@project-serum/anchor';
import got, { Response } from 'got';
import BN from 'bn.js';
import { MintLayout, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { 
	TOKEN_METADATA_PROGRAM_ID,
	getMasterEdition,
	getMetadata,
	createAssociatedTokenAccountInstruction,
} from './candyMachineV2';
import { SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID, getAtaForMint } from './utils';
import bs58 from 'bs58';

export const LAUNCHPAD_PROGRAM_ID = new anchor.web3.PublicKey(
	'CMY8R8yghKfFnHKCWjzrArUpYH4PbJ56aWBr4kCP4DMk',
);

interface MintConfig {
	candyMachineId: anchor.web3.PublicKey,
	config: anchor.web3.PublicKey,
	treasury: anchor.web3.PublicKey;
}

interface Collection {
	_id: string;
	symbol: string;
	name: string;
	description: string;
	published: boolean;
	mint: MintConfig;
	image: string;
	launchDate: string;
	price: number;
	size: number;
	updatedAt: Date;
	createdAt: Date;
	featured: boolean;
}

class APIError extends Error {
	constructor(endpoint: string, response: Response) {
		super(`${endpoint}. Code: ${response.statusCode}. Body: ${response.body}`);
	}
}

class UnableToFindCollectionError extends Error {
	constructor(name: string) {
		super(`Couldn't find ${name} collection on Magic Eden Launchpad`);
	}
}

const getCollection = async (name: string): Promise<Collection> => {
	try {
		const resp = await got.get('https://api-mainnet.magiceden.io/launchpad_collections');
		const collections: Collection[] = JSON.parse(resp.body);
		for (const c of collections) {
			if (c.name === name) {
				c.mint.candyMachineId = new anchor.web3.PublicKey(c.mint.candyMachineId);
				c.mint.config = new anchor.web3.PublicKey(c.mint.config);
				c.mint.treasury = new anchor.web3.PublicKey(c.mint.treasury);
				return c;
			};
		}
		throw new UnableToFindCollectionError(name);
	} catch (err) {
		if (!(err instanceof Error)) throw new Error(err);
		if (err instanceof got.HTTPError) throw new APIError(err.request.requestUrl, err.response);
		throw err;
	}
}

interface LaunchpadStateData {
	uuid: string;
	price: BN;
	itemsAvailable: BN;
	goLiveDate: BN;
	walletLimit: number;
}

export interface LaunchpadState {
	authority: anchor.web3.PublicKey;
	wallet: anchor.web3.PublicKey;
	config: anchor.web3.PublicKey;
	data: LaunchpadStateData;
	itemsRedeemed: BN;
	bump: number;
	notary: anchor.web3.PublicKey;
}

export interface LaunchpadAccount {
	id: anchor.web3.PublicKey;
	state: LaunchpadState;
	program: anchor.Program;
}

const getLaunchpadAccount = async (
	wallet: anchor.Wallet,
	candyMachineId: anchor.web3.PublicKey,
	conn: anchor.web3.Connection
): Promise<LaunchpadAccount> => {
	const provider = new anchor.Provider(conn, wallet, { commitment: 'finalized' });
	const idl = await anchor.Program.fetchIdl(LAUNCHPAD_PROGRAM_ID, provider);
	const program = new anchor.Program(idl, LAUNCHPAD_PROGRAM_ID, provider);
	
	const state: LaunchpadState = await program.account.candyMachine.fetch(candyMachineId);

	return {
		id: candyMachineId,
		state,
		program,
	}
}

const createMintIx = async (mintConfig: MintConfig, launchpadAccount: LaunchpadAccount, magicString='we live to fight another day') => {
	const program = launchpadAccount.program;
	const mint = anchor.web3.Keypair.generate();
	const masterEdition = await getMasterEdition(mint.publicKey);
	const metadata = await getMetadata(mint.publicKey);
	const walletLimit = await getWalletLimit(mintConfig.candyMachineId, program.provider.wallet.publicKey);
	const userTokenAccountAddress = (
		await getAtaForMint(mint.publicKey, program.provider.wallet.publicKey)
	)[0];

	const mintIx = program.transaction.mintNft(walletLimit[1], {
		accounts: {
			config: mintConfig.config,
			candyMachine: mintConfig.candyMachineId,
			payer: program.provider.wallet.publicKey,
			wallet: mintConfig.treasury,
			mint: mint.publicKey,
			metadata,
			masterEdition,
			walletLimitInfo: walletLimit[0],
			mintAuthority: program.provider.wallet.publicKey,
			updateAuthority: program.provider.wallet.publicKey,
			tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
			tokenProgram: TOKEN_PROGRAM_ID,
			systemProgram: anchor.web3.SystemProgram.programId,
			rent: anchor.web3.SYSVAR_RENT_PUBKEY,
			clock: anchor.web3.SYSVAR_CLOCK_PUBKEY
		},
		signers: [mint],
		remainingAccounts: [{
			pubkey: new anchor.web3.PublicKey('11111111111111111111111111111111'),
			isWritable: !0,
			isSigner: !1,
		}, {
			pubkey: program.provider.wallet.publicKey,
			isWritable: !1,
			isSigner: !1,
		}, {
			pubkey: launchpadAccount.state.notary || anchor.web3.SystemProgram.programId,
			isWritable: !1,
			isSigner: !0
		}],
		instructions: [
			anchor.web3.SystemProgram.createAccount({
				fromPubkey: program.provider.wallet.publicKey,
				newAccountPubkey: mint.publicKey,
				space: MintLayout.span,
				lamports: await program.provider.connection.getMinimumBalanceForRentExemption(
					MintLayout.span,
				),
			programId: TOKEN_PROGRAM_ID,
			}),
			new anchor.web3.TransactionInstruction({ // this is using memo, so i am not sure if it is correct
				keys: [],
				programId: new anchor.web3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
				data: Buffer.from(bs58.encode(Buffer.from(magicString))), // we live to fight another day
			}),
			Token.createInitMintInstruction(TOKEN_PROGRAM_ID, mint.publicKey, 0, program.provider.wallet.publicKey, program.provider.wallet.publicKey),
			createAssociatedTokenAccountInstruction(userTokenAccountAddress, program.provider.wallet.publicKey, program.provider.wallet.publicKey, mint.publicKey),
			Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint.publicKey, userTokenAccountAddress, program.provider.wallet.publicKey, [], 1)
		]
	});
	return mintIx;
}

interface NotaryResponse {
	publicKey: string;
	signature: string;
}

// error here, 403 forbidden
const signNotary = async (mintIx: anchor.web3.Transaction, launchpadAccount: LaunchpadAccount, magicString='we live to fight another day') => {
	const conn = launchpadAccount.program.provider.connection;
	const recentBlockhash = await conn.getRecentBlockhash();
	mintIx.recentBlockhash = recentBlockhash.blockhash;
	mintIx.feePayer = launchpadAccount.program.provider.wallet.publicKey;

	try {
		const resp = await got.post('https://wk-notary-prod.magiceden.io/sign', {
			body: JSON.stringify({
				message: bs58.encode(mintIx.serializeMessage()),
				response: bs58.encode(Buffer.from(magicString)),
			}),
			headers: {
				"accept": "application/json, text/plain, */*",
				"accept-language": "en-US,en;q=0.9",
				"content-type": "application/json",
				"sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"macOS\"",
				"sec-fetch-dest": "empty",
				"sec-fetch-mode": "cors",
				"sec-fetch-site": "same-site",
				"Referer": "https://www.magiceden.io/",
				"Referrer-Policy": "strict-origin-when-cross-origin"
			},
		});
		console.log(resp);
		const parsed: NotaryResponse = JSON.parse(resp.body);
		return parsed;
	} catch (err) {
		if (!(err instanceof Error)) throw new Error(err);
		if (err instanceof got.HTTPError) throw new APIError(err.request.requestUrl, err.response);
		throw err;
	}
}

const mint = async (collectionName: string, keypair: anchor.web3.Keypair, conn: anchor.web3.Connection) => {
	const collection = await getCollection(collectionName);
	const wallet = new anchor.Wallet(keypair);
	const launchpadAccount = await getLaunchpadAccount(wallet, collection.mint.candyMachineId, conn);
	const mintIx = await createMintIx(collection.mint, launchpadAccount);
	const { publicKey, signature } = await signNotary(mintIx, launchpadAccount);
	// get transaction data from source, and see if its just something wrong with hwo i am crafting transactions
	
}

const getWalletLimit = async (
	candyMachineId: anchor.web3.PublicKey,
	payer: anchor.web3.PublicKey
) => {
	return await anchor.web3.PublicKey.findProgramAddress(
		[Buffer.from('wallet_limit'), candyMachineId.toBuffer(), payer.toBuffer()],
		LAUNCHPAD_PROGRAM_ID,
	);
}

const main = async () => {
	const collection = await getCollection('Tongue Tied Society');
	const conn = new anchor.web3.Connection('https://solana52f86c0.genesysgo.net/');
	const keypair = anchor.web3.Keypair.generate();
	const wallet = new anchor.Wallet(keypair);
	const provider = new anchor.Provider(conn, wallet, { commitment: 'finalized' });
	const idl = await anchor.Program.fetchIdl(LAUNCHPAD_PROGRAM_ID, provider);
	const program = new anchor.Program(idl, LAUNCHPAD_PROGRAM_ID, provider);
	
	await mint('Tongue Tied Society', keypair, conn);
}

if (require.main === module) {
	main();
}