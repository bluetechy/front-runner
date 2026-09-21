const { awaiter } = require("../utilities/async");
const axios = require('axios');
const Exception = require("../utilities/exception");
const { isString, isObject, keyExists } = require("../utilities/core");

const connect = () => {
	return axios;
};

const isLoaded = (result) => {
	return !isObject(result) || !keyExists(result, 'items') || !result.items.length;
};

const getList = async (promise, mapper = null) => {
	const [error, result] = await awaiter(promise);
	if (error) {
		throw(error);
	}
	const hits = [];
	if (isLoaded(result)) {
		if (mapper == null) {
			mapper = record => record;
		}
		for (let i = 0; i < result.items.length; i++) {
			hits.push(mapper(result.items[i]));
		}
	}
	return hits;
};

const getObject = async (promise, mapper = null) => {
	const [error, result] = await awaiter(promise);
	if (error) {
		throw(error);
	}
	if (!isObject(result)) {
		throw Error('Unable to fetch record');
	}
	if (mapper == null) {
		mapper = record => record;
	}
	return mapper(result);
};

const getOne = async (promise, mapper = null) => {
	const [error, result] = await awaiter(promise);
	if (error) {
		throw(error);
	}
	if (!isLoaded(result)) {
		throw Error('Unable to fetch record');
	}
	if (mapper == null) {
		mapper = record => record;
	}
	return mapper(result.items[0]);
};

const post = async (path, body, headers = {}) => {
	const handle = connect();
	const [error, result] = await awaiter(handle({
		baseURL : 'https://hydraqa.unicity.net/v5a-test',
		data    : isString(body) ? body : JSON.stringify(body),
		headers : Object.assign({
			'content-type' : 'application/json'
		}, headers),
		method : 'POST',
		url    : path,
	}));
	if (error) {
		if (isObject(error)) {
			throw new Exception.InternalError(error?.response?.data?.error?.error_message ?? (error?.message ?? ''));
		}
		throw new Exception.InternalError(error);
	}
	return result.data;
};

module.exports = {
	connect,
	getList,
	getObject,
	getOne,
	isLoaded,
	post,
};
