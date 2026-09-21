const email = new RegExp(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i);
const token = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

const isEmailAddress = (value) => {
	return (typeof value === 'string') && value.match(email);
};

const isPassword = (value) => {
	return (typeof value === 'string') && value.length >= 8;
};

const isUUIDv4Token = (value) => {
	return (typeof value === 'string') && value.match(token);
};

module.exports.isEmailAddress = isEmailAddress;
module.exports.isPassword = isPassword;
module.exports.isUUIDv4Token = isUUIDv4Token;
