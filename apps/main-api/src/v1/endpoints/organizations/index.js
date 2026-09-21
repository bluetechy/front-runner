const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLString, GraphQLBoolean} = require('graphql');
const { getDefaultHandler, resolveList, resolveOne } = require('../../utilities/graphql');
const { getLoginName } = require('../../utilities/session');
const {	OrganizationType} = require('../../types');

const addOrganization = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."AddOrganization"($1, $2, $3)', [getLoginName(request), args.Name, true]);
};

const getOrganizations = async ({ request }) => {
	return postgres.query('SELECT * FROM dbo."GetOrganizations"($1)', [getLoginName(request)]);
};

const joinOrganization = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."JoinOrganization"($1, $2, $3)', [getLoginName(request), args.OrganizationUUID, args.UserUUID]);
};

const leaveOrganization = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."LeaveOrganization"($1, $2, $3)', [getLoginName(request), args.OrganizationUUID, args.UserUUID]);
};

const Mutation = new GraphQLObjectType({
	name: "OrganizationMutation",
	fields: {
		add: {
			type: OrganizationType,
			args: {
				Name: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(addOrganization),
		},
		join: { // only an owner can add a user to an organization
			type: OrganizationType,
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
				UserUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(joinOrganization),
		},
		leave: { // only an owner or the user itself can remove a user
			type: OrganizationType,
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
				UserUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(leaveOrganization),
		}
	}
});

const Query = new GraphQLObjectType({
	name: 'OrganizationQuery',
	fields: {
		list: {
			type: new GraphQLList(OrganizationType),
			resolve: resolveList(getOrganizations),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	mutation: Mutation,
	query: Query,
});
