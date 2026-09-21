const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLString} = require('graphql');
const { getDefaultHandler, resolveList } = require('../../utilities/graphql');
const { getLoginName } = require('../../utilities/session');
const {	BadgeType} = require('../../types');

const getBadges = async ({ request, args }) => {
	return postgres.query('SELECT * FROM dbo."GetBadges"($1, $2)', [getLoginName(request), args.OrganizationUUID]);
};

const Query = new GraphQLObjectType({
	name: 'BadgeQuery',
	fields: {
		list: {
			type: new GraphQLList(BadgeType),
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveList(getBadges),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	query: Query,
});
