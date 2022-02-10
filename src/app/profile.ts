export default interface Profile {
	paymentDetails: PaymentDetails;
	shippingAddress: Address;
	billingAddress: Address;
	name: string;
	pubkey: string;
}

export interface PaymentDetails {
	nameOnCard: string;
	cardType: string;
	cardNumber: string;
	cardExpMonth: string;
	cardExpYear: string;
	cardCvv: string;
}

export interface Address {
	name: string,
	email: string,
	phone: string,
	line1: string,
	line2: string,
	line3?: string,
	postCode: string,
	city: string,
	state: string,
	country: string,
}

export class ProfileNotFoundError extends Error {
	constructor(id: string) {
		super(`can not find profile with id ${id}`);
		this.name = 'ProfileNotFoundError';
	}
}