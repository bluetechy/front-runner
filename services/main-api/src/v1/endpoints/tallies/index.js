const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLString} = require('graphql');
const { getDefaultHandler, resolveList } = require('../../utilities/graphql');
const { getLoginName } = require('../../utilities/session');
const {	TallyType} = require('../../types');

const getTallies = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."GetTallies"($1, $2, $3)', [getLoginName(request), args.OrganizationUUID, 10]);
};

const Query = new GraphQLObjectType({
	name: 'TallyQuery',
	fields: {
		list: {
			type: new GraphQLList(TallyType),
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveList(getTallies),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	query: Query,
});
