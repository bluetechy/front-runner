const postgres = require('../../connectors/postgres');
const { GraphQLList, GraphQLObjectType, GraphQLNonNull, GraphQLString} = require('graphql');
const { getDefaultHandler, resolveList } = require('../../utilities/graphql');
const { getLoginName } = require('../../utilities/session');
const {	PointType} = require('../../types');

const getPoints = async ({ request, args }) => {
	return postgres.query('SELECT * FROM "dbo"."GetPoints"($1, $2)', [getLoginName(request), args.OrganizationUUID]);
};

const Query = new GraphQLObjectType({
	name: 'PointQuery',
	fields: {
		list: {
			type: new GraphQLList(PointType),
			args: {
				OrganizationUUID: {
					type: GraphQLNonNull(GraphQLString),
				},
			},
			resolve: resolveList(getPoints),
		},
	},
});

module.exports.defaultHandler = getDefaultHandler({
	query: Query,
});
