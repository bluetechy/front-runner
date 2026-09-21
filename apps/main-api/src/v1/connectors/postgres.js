const pg = require('pg');
const {awaiter} = require("../utilities/async");
const Exception = require("../utilities/exception");

const connection = new pg.Pool({
	database: process.env.POSTGRES_DATABASE,
	host: process.env.POSTGRES_ADDRESS,
	password: process.env.POSTGRES_PASSWORD,
	port: process.env.POSTGRES_PORT,
	user: process.env.POSTGRES_USER,
});

const connect = () => {
	return connection;
};

const isLoaded = (result) => {
	return result.rows && (result.rows.length > 0);
};

const query = async (sql, values = [], mapper = null) => {
	const handle = connect();
	const [error, result] = await awaiter(handle.query(sql, values));
	if (error) {
		throw new Exception.InternalError(error);
	}
	const hits = [];
	if (isLoaded(result)) {
		if (mapper == null) {
			mapper = record => record;
		}
		for (let i = 0; i < result.rows.length; i++) {
			hits.push(mapper(result.rows[i]));
		}
	}
	return hits;
};

module.exports = {
	connect,
	isLoaded,
	query,
};
