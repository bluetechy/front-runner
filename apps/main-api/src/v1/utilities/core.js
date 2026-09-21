const uuid = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

const isArray = value => {
	return Array.isArray(value) || value instanceof Array;
};

const isFunction = value => {
	return typeof value === 'function';
};

const isString = value => {
	return typeof value === 'string';
};

const isObject = value => {
	return value !== null && typeof value === 'object' && !(value instanceof Array);
};

const isUuid = value => {
	return isString(value) && value.match(uuid);
};

const keyExists = (object, key) => {
	return key in object;
};

const toQueryString = params => {
	return new URLSearchParams(params).toString();
};

module.exports = {
	isArray,
	isFunction,
	isString,
	isObject,
	isUuid,
	keyExists,
	toQueryString
};
