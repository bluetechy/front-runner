const awaiter = (promise) => {
	if (typeof promise.then === 'undefined') {
		promise = promisify(promise);
	}
	return promise.then((result) => {
		return [null, result];
	}).catch((error) => {
		return [error, null];
	});
};

const promisify = (func, context = null) => {
	return (...args) => {
		return new Promise((resolve, reject) => {
			const callback = (error, result) => {
				if (error) {
					reject(error);
				}
				else {
					resolve(result);
				}
			};
			func.apply(context, [...args, callback]);
		});
	};
};

module.exports.awaiter = awaiter;
module.exports.promisify = promisify;
