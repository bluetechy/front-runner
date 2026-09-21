const jwt = require('jsonwebtoken');
const { awaiter } = require("../../utilities/async");
const hydra = require('../../connectors/hydra');
const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLInputObjectType, GraphQLNonNull, GraphQLString} = require('graphql');
const { getDefaultHandler, resolveList, resolveObject, resolveOne } = require('../../utilities/graphql');
const {	UserType} = require('../../types');
const { getJWTSecretKey, getLoginName } = require('../../utilities/session');

const AuthInput = new GraphQLInputObjectType({
	name: 'AuthInput',
	description: 'This represents an auth input.',
	fields: {
		Value: {
			type: GraphQLNonNull(GraphQLString),
		},
	},
});

const getUser = async ({ request }) => {
	return postgres.query('SELECT * FROM dbo."GetUser"($1)', [getLoginName(request)]);
};

const getUsers = async ({ request }) => {
	return postgres.query('SELECT * FROM dbo."GetUsers"($1)', [getLoginName(request)]);
};

const loginUser = async ({ args }) => {
	const body = JSON.stringify({
		namespace: 'https://hydraqa.unicity.net/v5a-test/employees',
		type: 'base64',
		value: args.Auth.Value,
	});
	const [e1, h1] = await awaiter(hydra.post('/loginTokens?expand=whoami', body));
	if (e1) {
		throw(e1);
	}
	const LoginName= h1.employee.username;
	const Token = h1.token;
	const expiresIn = h1.whoami.loginTokenSecondsLeft;
	const [e2, h2] = await awaiter(postgres.query('SELECT * FROM dbo."LoginUser"($1)', [LoginName]));
	if (e2) {
		throw(e2);
	}
	const hit = h2[0];
	const user = {
		UserUUID: hit.UserUUID,
		Name: hit.Name,
		LoginName: hit.LoginName,
		Email: hit.Email,
		Token: Token,
		IsAdmin: hit.IsAdmin,
	};
	user.Token = jwt.sign(user, getJWTSecretKey(), { expiresIn });
	return user;
};

const Mutation = new GraphQLObjectType({
	name: "UserMutation",
	fields: {
		login: {
			type: UserType,
			args: {
				Auth: {
					type: AuthInput
				},
			},
			resolve: resolveObject(loginUser),
		}
	}
});

const Query = new GraphQLObjectType({
	name: 'UserQuery',
	fields: {
		get: {
			type: UserType,
			resolve: resolveOne(getUser),
		},
		list: {
			type: new GraphQLList(UserType),
			resolve: resolveList(getUsers),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	mutation: Mutation,
	query: Query,
});
