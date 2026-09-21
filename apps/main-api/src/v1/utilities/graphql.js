const { awaiter } = require("./async");
const { graphqlHTTP } = require('express-graphql');
const { GraphQLSchema } = require("graphql");

const getDefaultHandler = (schema) => {
	return graphqlHTTP((request) => ({
		context: { request },
		schema: new GraphQLSchema(schema),
	}));
};

const resolveList = (callback) => {
	return async (root, args, context) => {
		const payload = { request: context.request, args: args };
		const [error, hits] = await awaiter(callback(payload));
		if (error) {
			console.error(error);
			throw(error);
		}
		return hits;
	};
};

const resolveObject = (callback) => {
	return async (parent, args, context) => {
		const payload = { request: context.request, args: args };
		const [error, hit] = await awaiter(callback(payload));
		if (error) {
			console.error(error);
			throw(error);
		}
		return hit;
	};
};

const resolveOne = (callback) => {
	return async (parent, args, context) => {
		const payload = { request: context.request, args: args };
		const [error, hits] = await awaiter(callback(payload));
		if (error) {
			console.error(error);
			throw(error);
		}
		return hits[0];
	};
};

module.exports = {
	getDefaultHandler,
	resolveList,
	resolveObject,
	resolveOne,
};
