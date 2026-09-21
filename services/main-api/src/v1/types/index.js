const {
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLID,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLString,
} = require("graphql");

const BadgeType = new GraphQLObjectType({
	name: 'BadgeType',
	fields: {
		UserUUID: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.UserUUID;
			},
		},
		OrganizationUUID: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.OrganizationUUID;
			},
		},
		BadgeUUID: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.BadgeUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		Description: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Description;
			},
		},
		Level: {
			type: GraphQLNonNull(GraphQLInt),
			resolve: (root) => {
				return root.Level;
			},
		},
	},
});

const OrganizationType = new GraphQLObjectType({
	name: 'OrganizationType',
	fields: {
		OrganizationUUID: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.OrganizationUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		TeamCount: {
			type: GraphQLNonNull(GraphQLInt),
			resolve: (root) => {
				return root.TeamCount;
			},
		},
		UserCount: {
			type: GraphQLNonNull(GraphQLInt),
			resolve: (root) => {
				return root.UserCount;
			},
		},
		OwnerCount: {
			type: GraphQLNonNull(GraphQLInt),
			resolve: (root) => {
				return root.OwnerCount;
			},
		},
		IsOwner: {
			type: GraphQLNonNull(GraphQLBoolean),
			resolve: (root) => {
				return root.IsOwner;
			},
		},
	},
});

const PointType = new GraphQLObjectType({
	name: 'PointType',
	fields: {
		UserPointUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.UserPointUUID;
			},
		},
		UserUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.UserUUID;
			},
		},
		OrganizationUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.OrganizationUUID;
			},
		},
		PointUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.PointUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		Description: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Description;
			},
		},
		Amount: {
			type: GraphQLNonNull(GraphQLFloat),
			resolve: (root) => {
				return root.Amount;
			},
		},
		ExpiresAt: {
			type: GraphQLString,
			resolve: (root) => {
				return root.ExpiresAt;
			},
		},
	},
});

const TallyType = new GraphQLObjectType({
	name: 'TallyType',
	fields: {
		OrganizationUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.OrganizationUUID;
			},
		},
		UserUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.UserUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		PointUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.PointUUID;
			},
		},
		Amount: {
			type: GraphQLNonNull(GraphQLFloat),
			resolve: (root) => {
				return root.Amount;
			},
		},
	},
});

const TeamType = new GraphQLObjectType({
	name: 'TeamType',
	fields: {
		OrganizationUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.OrganizationUUID;
			},
		},
		TeamUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.TeamUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		UserCount: {
			type: GraphQLNonNull(GraphQLInt),
			resolve: (root) => {
				return root.UserCount;
			},
		},
		IsManager: {
			type: GraphQLBoolean,
			resolve: (root) => {
				return root.IsManager;
			},
		},
	},
});

const UserType = new GraphQLObjectType({
	name: 'UserType',
	fields: {
		UserUUID: {
			type: GraphQLNonNull(GraphQLID),
			resolve: (root) => {
				return root.UserUUID;
			},
		},
		Name: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.Name;
			},
		},
		LoginName: {
			type: GraphQLNonNull(GraphQLString),
			resolve: (root) => {
				return root.LoginName;
			},
		},
		Email: {
			type: GraphQLString,
			resolve: (root) => {
				return root.Email;
			},
		},
		Token: {
			type: GraphQLString,
			resolve: (root) => {
				return root.Token;
			},
		},
		IsAdmin: {
			type: GraphQLBoolean,
			resolve: (root) => {
				return root.IsAdmin;
			},
		},
	},
});

module.exports = {
	BadgeType,
	OrganizationType,
	PointType,
	TallyType,
	TeamType,
	UserType,
};
