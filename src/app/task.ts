import baseLogger from './logger';
import creditCardType from 'credit-card-type';
import Profile from './profile';
import { Logger } from 'winston';

const logger = baseLogger.child({ process: 'client' });

export type setStatusFunc = (status: string) => void;
export type setRenderMenuFunc = () => void;

export interface TaskClient {
	logger: Logger;
	start(): Promise<void>;
	stop(): Promise<void>;
	logInfo(s: string): void;
	setRenderMenu(): void;
}

// TODO: get rid of unecessary options from old sneaker bot
// TODO: task options should be generic, and each chain implements own task with specific options
export interface TaskOptions {
	id: string;
	profile: string;
	priority: string;
	param1: string;
	param2: string;
	param3: string;
	mintFunction: string; // REMARK: should be named mintFunctionName
	monitorFunction: string; // REMARK: should be named monitorFunctionName
	collection: string;
	url: string;
	siteName: SiteName;
	site: string;
	useAutofill: boolean;
	useProxies: boolean;
	useAutoSolve: boolean;
	useCaptchaBypass: boolean;
	useUserAgent: boolean;
	proxy: string | null;
	profileInfo: Profile;
	keywords: string;
	size: string;
	color: string;
	delay: number;
	locationPref: string;
}

type SiteName = 'Mint' | 'MintParam';

export default class Task {
	// REMARK: Can have most of this in an options variable instead of spreading them out like this
	id: string;
	profile: string;
	priority: string;
	param1: string;
	param2: string;
	param3: string;
	mintFunction: string;
	monitorFunction: string;
	collection: string;
	url: string;
	siteName: SiteName;
	site: string;
	useAutofill: boolean;
	useProxies: boolean;
	useAutoSolve: boolean;
	useCaptchaBypass: boolean;
	useUserAgent: boolean;
	proxy: string | null;
	profileInfo: Profile;
	keywords: string;
	size: string;
	color: string;
	delay: number;
	locationPref: string;
	stopped = false;
	client: TaskClient | undefined;
	setStatus: ((status: string) => void) | undefined;

	constructor({
		id,
		profile,
		priority,
		param1,
		param2,
		param3,
		mintFunction,
		monitorFunction,
		collection,
		url,
		siteName,
		site,
		useAutofill,
		useProxies,
		useAutoSolve,
		useCaptchaBypass,
		useUserAgent,
		proxy,
		profileInfo,
		keywords,
		size,
		color,
		delay,
		locationPref
	}: TaskOptions) {
		this.id = id;
		this.profile = profile;
		this.url = url;
		this.siteName = siteName;
		this.site = site;
		this.useAutofill = useAutofill;
		this.useProxies = useProxies;
		this.useAutoSolve = useAutoSolve;
		this.useCaptchaBypass = useCaptchaBypass;
		this.useUserAgent = useUserAgent;
		// REMARK: can just use if (proxy !== null) instead of having useProxies
		if (this.useProxies) {
			this.proxy = proxy;
		} else {
			this.proxy = null;
		}
		this.profileInfo = profileInfo;
		this.keywords = keywords;
		this.size = size;
		this.color = color;
		this.param1 = param1;
		this.param2 = param2;
		this.param3 = param3;
		this.collection = collection;
		this.monitorFunction = monitorFunction;
		this.mintFunction = mintFunction;
		this.priority = priority;
		this.delay = delay;
		this.locationPref = locationPref;
	}

	/**
	 * @param {string | object} message string or serializable object to be logged at the error level
	 */
	logError(message: string, id = this.id) {
		logger.error(message, { process: `client ${id}` });
	};

	/**
	* 
	* @param {string | object} message string or serializable object to be logged  at the info level
	*/
	logInfo(message: string, id = this.id) {
		logger.info(message, { process: `client ${id}` });
	};

	/**
	* 
	* @param {string | object} message string or serializable object to be logged at the debug level 
	*/
	logDebug(message: string, id = this.id) {
		logger.debug(message, { process: `client ${id}` });
	};

	// TODO: not sure what this is
	stop() {
		if (this.setStatus === undefined) {
			logger.error('setStatus is undefined on task ' + this.id);
		} else {
			this.setStatus('Stopped');
		}
		this.stopped = true;
	}

	// this is useful for all tasks
	wait(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	};

	convertKeywords() {
		const positiveKeywords = this.keywords.split(',').filter(keyword => keyword.includes('+')).map(keyword => keyword.replace('+', '').trim())
		const negativeKeywords = this.keywords.split(',').filter(keyword => keyword.includes('-')).map(keyword => keyword.replace('-', '').trim())
		return { positiveKeywords, negativeKeywords }
	}

	// this is useful for all tasks
	// TODO: idk if this is the correct inputs
	abbrState(input: string, to: string) {
		var states = [
			['Arizona', 'AZ'],
			['Alabama', 'AL'],
			['Alaska', 'AK'],
			['Arkansas', 'AR'],
			['California', 'CA'],
			['Colorado', 'CO'],
			['Connecticut', 'CT'],
			['Delaware', 'DE'],
			['Florida', 'FL'],
			['Georgia', 'GA'],
			['Hawaii', 'HI'],
			['Idaho', 'ID'],
			['Illinois', 'IL'],
			['Indiana', 'IN'],
			['Iowa', 'IA'],
			['Kansas', 'KS'],
			['Kentucky', 'KY'],
			['Louisiana', 'LA'],
			['Maine', 'ME'],
			['Maryland', 'MD'],
			['Massachusetts', 'MA'],
			['Michigan', 'MI'],
			['Minnesota', 'MN'],
			['Mississippi', 'MS'],
			['Missouri', 'MO'],
			['Montana', 'MT'],
			['Nebraska', 'NE'],
			['Nevada', 'NV'],
			['New Hampshire', 'NH'],
			['New Jersey', 'NJ'],
			['New Mexico', 'NM'],
			['New York', 'NY'],
			['North Carolina', 'NC'],
			['North Dakota', 'ND'],
			['Ohio', 'OH'],
			['Oklahoma', 'OK'],
			['Oregon', 'OR'],
			['Pennsylvania', 'PA'],
			['Rhode Island', 'RI'],
			['South Carolina', 'SC'],
			['South Dakota', 'SD'],
			['Tennessee', 'TN'],
			['Texas', 'TX'],
			['Utah', 'UT'],
			['Vermont', 'VT'],
			['Virginia', 'VA'],
			['Washington', 'WA'],
			['West Virginia', 'WV'],
			['Wisconsin', 'WI'],
			['Wyoming', 'WY'],
			['Alberta', 'AB'],
			['British Columnbia', 'BC'],
			['Manitoba', 'MB'],
			['New Brunswick', 'NB'],
			['Newfoundland and Labrador', 'NL'],
			['Northwest Territories', 'NT'],
			['Nova Scotia', 'NS'],
			['Nunavut', 'NU'],
			['Ontario', 'ON'],
			['Prince Edward Island', 'PE'],
			['Quebec', 'QC'],
			['Saskatchewan', 'SK'],
			['Yukon', 'YT'],
			['United States', 'USA'],
			['Canada', 'CANADA']
		];

		if (to == 'abbr') {
			input = input.replace(/\w\S*/g, (txt: string) =>  txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
			for (let i = 0; i < states.length; i++) {
				if (states[i][0] == input) {
					return (states[i][1]);
				}
			}
		} else if (to == 'name') {
			input = input.toUpperCase();
			for (let i = 0; i < states.length; i++) {
				if (states[i][1] == input) {
					return (states[i][0]);
				}
			}
		}
	}

	// credit card formatting utils

	/**
	 * Trims the given credit card expiration month value.
	 * @returns {string} Returns empty string if profileInfo is undefined.
	 */
	trimCardExpMonth() {
		if (!this.profileInfo) return '';
		let month = this.profileInfo.paymentDetails.cardExpMonth;
		return month.startsWith('1') ? month : month.slice(1);
	};

	/**
	 * Trims the given credit card expiration year value.
	 * @returns {string} Returns empty string if profileInfo is undefined.
	 */
	trimCardExpYear() {
		if (!this.profileInfo) return '';
		let year = this.profileInfo.paymentDetails.cardExpYear;
		return year.startsWith(Math.trunc(new Date().getFullYear() / 100).toString()) ?
			year :
			year.slice(0, 2);
	};

	/**
	 * Formats current credit card number with a given delimiter. Returns empty string if profileInfo is undefined
	 * @param {string} delimiter card number will be delimited by this string value, defaults to " "
	 * @returns {string} Formatted card number value delimited by delimiter value.
	 */
	formatCardNumber(delimiter = ' ') {
		if (!this.profileInfo) return '';
		let cardNumber = this.profileInfo.paymentDetails.cardNumber;
		const [{ gaps }] = creditCardType(cardNumber);
		let cardFrag = cardNumber.split('');
		gaps.forEach((gap, idx, arr) => cardFrag.splice(gap + idx, 0, delimiter));
		return cardFrag.join('');
	};
}
