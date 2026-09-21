const { isFunction } = require('../utilities/core');

const awaiter = promise => {
	try {
		if (!isFunction(promise.then)) {
			promise = promisify(promise);
		}
		return promise
			.then(result => {
				return [null, result];
			})
			.catch(error => {
				return [error, null];
			});
	} catch (error) {
		return [error, null];
	}
};

const promisify = (func, context = null) => {
	return (...args) => {
		return new Promise((resolve, reject) => {
			const callback = (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			};
			func.apply(context, [...args, callback]);
		});
	};
};

module.exports = {
	awaiter,
	promisify,
};
