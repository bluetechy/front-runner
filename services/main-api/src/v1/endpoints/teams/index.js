const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLString} = require('graphql');
const { getDefaultHandler, resolveList, resolveOne } = require('../../utilities/graphql');
const { getLoginName } = require('../../utilities/session');
const {	TeamType} = require('../../types');

const addTeam = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."AddTeam"($1, $2, $3)', [getLoginName(request), args.OrganizationUUID, args.TeamName]);
};

const getTeams = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."GetTeams"($1, $2)', [getLoginName(request), args.OrganizationUUID]);
};

const joinTeam = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."JoinTeam"($1, $2, $3)', [getLoginName(request), args.TeamUUID, args.UserUUID]);
};

const leaveTeam = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."LeaveTeam"($1, $2, $3)', [getLoginName(request), args.TeamUUID, args.UserUUID]);
};

const Mutation = new GraphQLObjectType({
	name: "TeamMutation",
	fields: {
		add: {
			type: TeamType,
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
				TeamName: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(addTeam),
		},
		join: {
			type: TeamType,
			args: {
				TeamUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
				UserUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(joinTeam),
		},
		leave: {
			type: TeamType,
			args: {
				TeamUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
				UserUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveOne(leaveTeam),
		},
	}
});

const Query = new GraphQLObjectType({
	name: 'TeamQuery',
	fields: {
		list: {
			type: new GraphQLList(TeamType),
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveList(getTeams),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	mutation: Mutation,
	query: Query,
});
