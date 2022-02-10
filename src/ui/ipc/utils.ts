export const stringToHex = (str: string) => {
	let hexString = '';
	str.split('').forEach((c) => hexString += (c.codePointAt(0) as number).toString(16));

	return hexString;
};
