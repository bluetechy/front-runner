const jwt = require('jsonwebtoken');

const getBearerToken = (request, defval = 'anonymous') => {
	let token = request?.headers?.authorization || '';
	if (token.match(/^ *basic +([a-z0-9._~+/-]+=*) *$/i)) {
		token = Buffer.from(token.split(/basic +/i)[1].trim(), 'base64').toString();
	} else if (token.match(/^ *bearer +/i)) {
		token = token.split(/bearer +/i)[1] || '';
	}
	token = token.trim();
	return (token.length > 0) ? token : defval;
};

const getJWTSecretKey = () => {
	return process.env.JWT_SECRET_KEY;
};

const getLoginName = (request) => {
	const { LoginName } = jwt.verify(getBearerToken(request), getJWTSecretKey());
	return LoginName;
	//return 'admin';
};

module.exports = {
	getBearerToken,
	getJWTSecretKey,
	getLoginName,
};
