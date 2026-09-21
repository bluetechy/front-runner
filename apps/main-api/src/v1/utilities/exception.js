const { awaiter } = require('./async');

// https://codeburst.io/better-error-handling-in-express-js-b118fc29e9c7
// https://stackoverflow.com/questions/44327291/express-js-wrap-every-middleware-route-in-decorator
class RuntimeError extends Error {

	constructor(message = '') {
		super();
		this.message = message;
	}

}

class BadRequest extends RuntimeError { }
class InternalError extends RuntimeError { }
class NotFound extends RuntimeError { }
class NotImplemented extends RuntimeError { }
class Unauthorized extends RuntimeError { }
class UpstreamError extends RuntimeError {

	constructor(message = '', code = 500) {
		super(message);
		this.code = code;
	}

}

module.exports.BadRequest = BadRequest;
module.exports.InternalError = InternalError;
module.exports.NotFound = NotFound;
module.exports.NotImplemented = NotImplemented;
module.exports.Unauthorized = Unauthorized;
module.exports.UpstreamError = UpstreamError;

module.exports.TryCatch = (func) => async (request, response, next) => {
	const [error, result] = await awaiter(func(request, response, next));
	if (error) {
		console.error(error.message);
		if (error instanceof RuntimeError) {
			if (error instanceof BadRequest) return response.boom.badRequest(error.message);
			if (error instanceof NotFound) return response.boom.notFound(error.message);
			if (error instanceof NotImplemented) return response.boom.notImplemented(error.message);
			if (error instanceof Unauthorized) return response.boom.unauthorized(error.message);
			if (error instanceof UpstreamError) return response.status(500).json({
				statusCode: 500,
				error: 'Upstream Server Error',
				message: error.message,
				upstreamCode: error.code,
			});
		}
		return response.status(500).json({
			statusCode: 500,
			error: 'Internal Server Error',
			//message: error.message,
		});
	}
	next();
};
