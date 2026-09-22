import "reflect-metadata";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Test } from "@nestjs/testing";
import { GraphQLSchemaHost } from "@nestjs/graphql";
import { isInputObjectType } from "graphql";
import {
  BadRequestException,
  ForbiddenException,
  INestApplication,
} from "@nestjs/common";
import request from "supertest";
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
} from "jose";
import { AppModule } from "./app.module.js";
import { DatabaseService } from "./database/index.js";
import { KEYCLOAK_KEY_SET } from "./authentication/index.js";

const userId = "00000000-0000-4000-8000-000000000001";
const orgId = "00000000-0000-4000-8000-000000000002";
const teamId = "00000000-0000-4000-8000-000000000003";
const invitationId = "00000000-0000-4000-8000-000000000004";
const issuer = "https://identity.example.test/realms/front-runner";

const account = {
  UserUUID: userId,
  Name: "Alice Example",
  LoginName: "alice",
  Email: "alice@example.test",
  IsEnabled: true,
};
const profile = {
  UserUUID: userId,
  Name: "Alice Example",
  LoginName: "alice",
  Email: "alice@example.test",
  IsAdmin: false,
};
const userProfile = {
  UserUUID: userId,
  FirstName: "Alice",
  LastName: "Example",
  NickName: "Al",
  Designation: "Programme manager",
  Biography: "Runs the scoreboard.",
  Language: "en-US",
  Phone: "+1 555 0134",
  Address: "San Francisco, CA",
  Website: "alice.example",
  Twitter: "",
  Facebook: "",
  LinkedIn: "",
  Github: "github.com/alice",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};
const organization = {
  OrganizationUUID: orgId,
  Name: "Acme",
  TeamCount: 1,
  UserCount: 1,
  OwnerCount: 1,
  IsOwner: true,
  IsEnabled: true,
};
const team = {
  OrganizationUUID: orgId,
  TeamUUID: teamId,
  Name: "Builders",
  UserCount: 1,
  IsManager: true,
};
const member = {
  UserUUID: userId,
  Name: "Alice Example",
  LoginName: "alice",
  Email: "alice@example.test",
  IsOwner: true,
  JoinedAt: new Date("2026-01-01T00:00:00Z"),
};
const invitation = {
  InvitationUUID: invitationId,
  OrganizationUUID: orgId,
  OrganizationName: "Acme",
  Email: "newcomer@example.test",
  IsOwner: false,
  Status: "Pending",
  ExpiresAt: new Date("2030-01-01T00:00:00Z"),
  RespondedAt: null,
  InvitedByLoginName: "alice",
};

describe("GraphQL application", () => {
  let app: INestApplication;
  let signingKey: CryptoKey;
  let token: string;
  const query =
    jest.fn<
      (sql: string, values?: unknown[]) => Promise<Record<string, unknown>[]>
    >();

  // The realm's signing key, generated here. The application verifies real
  // RS256 signatures against it -- only the key set's address is replaced, so
  // no test touches the network.
  const sign = async (claims: Record<string, unknown> = {}) =>
    new SignJWT({
      typ: "Bearer",
      preferred_username: "alice",
      name: "Alice Example",
      email: "alice@example.test",
      ...claims,
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setSubject("subject-alice")
      .setIssuer(issuer)
      .setAudience("main-api")
      .setExpirationTime("1h")
      .sign(signingKey);

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    signingKey = pair.privateKey;
    const jwk = (await exportJWK(pair.publicKey)) as JWK;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService)
      .useValue({ query })
      .overrideProvider(KEYCLOAK_KEY_SET)
      .useValue(
        createLocalJWKSet({ keys: [{ ...jwk, alg: "RS256", use: "sig" }] }),
      )
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    token = await sign();
  });
  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async (sql) => {
      if (sql.includes('WHERE "SubjectId"')) return [account];
      if (sql.includes('"ProvisionUser"')) return [account];
      if (sql.includes('"GetUser"') || sql.includes('"GetUsers"'))
        return [profile];
      if (/"(GetUserProfile|SetUserProfile)"/.test(sql)) return [userProfile];
      if (
        sql.includes('"IsOwnerOfOrganization"') &&
        !sql.includes('FROM dbo."Teams"')
      )
        return [{ allowed: true }];
      if (sql.includes('FROM dbo."Teams"'))
        return [{ member: true, manager: true, target_member: true }];
      if (
        /"(GetOrganizations|GetOrganization|AddOrganization|LeaveOrganization|RenameOrganization|SetOrganizationEnabled)"/.test(
          sql,
        )
      )
        return [organization];
      if (/"(GetOrganizationMembers|SetOrganizationRole)"/.test(sql))
        return [member];
      if (/"(GetTeams|AddTeam|JoinTeam|LeaveTeam)"/.test(sql)) return [team];
      if (/Invitation/.test(sql)) return [invitation];
      if (sql.includes('"GetPoints"'))
        return [
          {
            UserPointUUID: teamId,
            UserUUID: userId,
            OrganizationUUID: orgId,
            PointUUID: teamId,
            Name: "XP",
            Description: "Completed task",
            Amount: "900719925474099.1234",
            ExpiresAt: new Date("2030-01-01T00:00:00Z"),
          },
        ];
      if (sql.includes('"GetTallies"'))
        return [
          {
            OrganizationUUID: orgId,
            UserUUID: userId,
            PointUUID: teamId,
            Name: "Alice",
            Amount: "12.3400",
          },
        ];
      if (sql.includes('"GetBadges"'))
        return [
          {
            UserUUID: userId,
            OrganizationUUID: orgId,
            BadgeUUID: teamId,
            Name: "Starter",
            Description: null,
            Level: 1,
            EarnedAt: new Date("2026-01-01T00:00:00Z"),
            EarnedDescription: null,
          },
        ];
      return [];
    });
  });

  const execute = (
    document: string,
    variables = {},
    authorization = `Bearer ${token}`,
  ) =>
    request(app.getHttpServer())
      .post("/graphql")
      .set("Authorization", authorization)
      .send({ query: document, variables });

  it("serves all six read features through one schema and preserves exact decimals and ISO timestamps", async () => {
    const response = await execute(
      `query Dashboard($org: String!) {
      me { UserUUID LoginName Email }
      users { UserUUID }
      organizations { OrganizationUUID Name }
      teams(organizationId: $org) { TeamUUID }
      badges(organizationId: $org) { BadgeUUID Description EarnedAt }
      points(organizationId: $org) { Amount ExpiresAt }
      tallies(organizationId: $org) { Amount }
    }`,
      { org: orgId },
    );
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.me.LoginName).toBe("alice");
    expect(response.body.data.points[0]).toEqual({
      Amount: "900719925474099.1234",
      ExpiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(response.body.data.badges[0].Description).toBeNull();
    expect(response.body.data.tallies[0].Amount).toBe("12.3400");
    expect(
      query.mock.calls.filter(([sql]) => sql.includes('WHERE "SubjectId"')),
    ).toHaveLength(1);
  });

  it.each([
    [
      "addOrganization",
      'name: "Acme"',
      "OrganizationUUID",
      "AddOrganization",
      ["alice", "Acme"],
    ],
    [
      "leaveOrganization",
      `organizationId: "${orgId}", userId: "${userId}"`,
      "OrganizationUUID",
      "LeaveOrganization",
      ["alice", orgId, userId],
    ],
    [
      "addTeam",
      `organizationId: "${orgId}", name: "Builders"`,
      "TeamUUID",
      "AddTeam",
      ["alice", orgId, "Builders"],
    ],
    [
      "joinTeam",
      `teamId: "${teamId}", userId: "${userId}"`,
      "TeamUUID",
      "JoinTeam",
      ["alice", teamId, userId],
    ],
    [
      "leaveTeam",
      `teamId: "${teamId}", userId: "${userId}"`,
      "TeamUUID",
      "LeaveTeam",
      ["alice", teamId, userId],
    ],
    [
      "inviteToOrganization",
      `organizationId: "${orgId}", email: "Newcomer@Example.test"`,
      "InvitationUUID",
      "InviteToOrganization",
      ["alice", orgId, "newcomer@example.test", false],
    ],
    [
      "acceptInvitation",
      `invitationId: "${invitationId}"`,
      "InvitationUUID",
      "AcceptOrganizationInvitation",
      ["alice", invitationId],
    ],
    [
      "declineInvitation",
      `invitationId: "${invitationId}"`,
      "InvitationUUID",
      "DeclineOrganizationInvitation",
      ["alice", invitationId],
    ],
    [
      "revokeInvitation",
      `invitationId: "${invitationId}"`,
      "InvitationUUID",
      "RevokeOrganizationInvitation",
      ["alice", invitationId],
    ],
    [
      "renameOrganization",
      `organizationId: "${orgId}", name: "  Acme Holdings  "`,
      "Name",
      "RenameOrganization",
      ["alice", orgId, "Acme Holdings"],
    ],
    [
      "setOrganizationRole",
      `organizationId: "${orgId}", userId: "${userId}", isOwner: true`,
      "IsOwner",
      "SetOrganizationRole",
      ["alice", orgId, userId, true],
    ],
    [
      "setOrganizationEnabled",
      `organizationId: "${orgId}", isEnabled: false`,
      "IsEnabled",
      "SetOrganizationEnabled",
      ["alice", orgId, false],
    ],
  ])(
    "executes %s using the verified actor and parameterized SQL",
    async (operation, args, field, functionName, values) => {
      const response = await execute(
        `mutation { ${operation}(${args}) { ${field} } }`,
      );
      expect(response.body.errors).toBeUndefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining(`dbo."${functionName}"`),
        values,
      );
    },
  );

  // Joining an organization is not a mutation any more. An owner invites, and
  // the invitee accepts; there is no way to put somebody into an organization
  // they did not agree to.
  it("no longer exposes a way to add a user to an organization directly", async () => {
    const response = await execute(
      `mutation { joinOrganization(organizationId: "${orgId}", userId: "${userId}") { Name } }`,
    );
    expect(response.body.errors[0].extensions.code).toBe(
      "GRAPHQL_VALIDATION_FAILED",
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("reads invitations from both sides", async () => {
    const response = await execute(
      `query($org: String!) {
      invitations { InvitationUUID OrganizationName Status ExpiresAt InvitedByLoginName }
      organizationInvitations(organizationId: $org) { Email Status RespondedAt }
    }`,
      { org: orgId },
    );
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.invitations[0]).toMatchObject({
      OrganizationName: "Acme",
      Status: "Pending",
      ExpiresAt: "2030-01-01T00:00:00.000Z",
    });
    expect(
      response.body.data.organizationInvitations[0].RespondedAt,
    ).toBeNull();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetUserInvitations"'),
      ["alice", 50, 0],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetOrganizationInvitations"'),
      ["alice", orgId, 50, 0],
    );
  });

  it("reads one organization on its own", async () => {
    const response = await execute(
      `query($org: String!){ organization(organizationId: $org){ Name IsOwner IsEnabled } }`,
      { org: orgId },
    );
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.organization).toEqual({
      Name: "Acme",
      IsOwner: true,
      IsEnabled: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetOrganization"'),
      ["alice", orgId],
    );
  });

  // Belonging to nothing is a normal state, and asking about an organization
  // you are not in is a miss rather than an error.
  it("answers null for an organization the caller does not belong to", async () => {
    query.mockImplementation(async (sql) =>
      sql.includes('WHERE "SubjectId"') ? [account] : [],
    );
    const response = await execute(
      `query($org: String!){ organization(organizationId: $org){ Name } }`,
      { org: orgId },
    );
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.organization).toBeNull();
  });

  it("hides archived organizations from the list unless asked for them, and says which are archived", async () => {
    await execute("{ organizations { Name } }");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetOrganizations"'),
      ["alice", 50, 0, false],
    );

    query.mockImplementation(async (sql) =>
      sql.includes('WHERE "SubjectId"')
        ? [account]
        : [{ ...organization, IsEnabled: false }],
    );
    const response = await execute(
      "{ organizations(includeArchived: true) { Name IsEnabled } }",
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetOrganizations"'),
      ["alice", 50, 0, true],
    );
    expect(response.body.data.organizations[0]).toEqual({
      Name: "Acme",
      IsEnabled: false,
    });
  });

  it("lists the people in an organization, owners first", async () => {
    const response = await execute(
      `query($org: String!){ organizationMembers(organizationId: $org){ LoginName IsOwner JoinedAt } }`,
      { org: orgId },
    );
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.organizationMembers[0]).toEqual({
      LoginName: "alice",
      IsOwner: true,
      JoinedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetOrganizationMembers"'),
      ["alice", orgId, 50, 0],
    );
  });

  // These operations carry no pre-check of their own -- the last-owner guard,
  // the ownership test and the membership test are all the database's. What is
  // checked here is that the refusal survives the trip back out with its code
  // and its reason. Turning a P0001 into one of these is DatabaseService's job
  // and is covered in database.test.ts; the mock stands in for it.
  it.each([
    [
      "setOrganizationRole",
      `mutation { setOrganizationRole(organizationId: "${orgId}", userId: "${userId}", isOwner: false) { IsOwner } }`,
      new BadRequestException("The last owner cannot be demoted."),
      "BAD_REQUEST",
      "The last owner cannot be demoted.",
    ],
    [
      "organizationInvitations",
      `query { organizationInvitations(organizationId: "${orgId}") { Email } }`,
      new ForbiddenException("Action cannot be performed."),
      "FORBIDDEN",
      "Action cannot be performed.",
    ],
    [
      "acceptInvitation",
      `mutation { acceptInvitation(invitationId: "${invitationId}") { Status } }`,
      new BadRequestException("That invitation has expired."),
      "BAD_REQUEST",
      "That invitation has expired.",
    ],
  ])(
    "reports a rule the database refused on %s without turning it into a failure",
    async (_operation, document, thrown, code, message) => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('WHERE "SubjectId"')) return [account];
        throw thrown;
      });
      const response = await execute(document);
      expect(response.body.errors[0].extensions.code).toBe(code);
      expect(response.body.errors[0].message).toBe(message);
    },
  );

  it("rejects a blank organization name on rename", async () => {
    const response = await execute(
      `mutation { renameOrganization(organizationId: "${orgId}", name: "   ") { Name } }`,
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(
      query.mock.calls.some(([sql]) => sql.includes("RenameOrganization")),
    ).toBe(false);
  });

  it("rejects an invitation to an address it could not store", async () => {
    const response = await execute(
      `mutation { inviteToOrganization(organizationId: "${orgId}", email: "not-an-address") { Email } }`,
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(
      query.mock.calls.some(([sql]) => sql.includes("InviteToOrganization")),
    ).toBe(false);
  });

  // The profile is the one thing a person may write about themselves, and it
  // is always their own: the mutation takes no user, so the login name in the
  // parameters can only be the token's.
  it("reads and writes the signed-in account's own profile", async () => {
    const read = await execute("{ profile { Designation Language } }");
    expect(read.body.errors).toBeUndefined();
    expect(read.body.data.profile).toEqual({
      Designation: "Programme manager",
      Language: "en-US",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."GetUserProfile"'),
      ["alice"],
    );

    const written = await execute(
      `mutation Save($profile: UserProfileInput!) {
        updateProfile(profile: $profile) { Designation }
      }`,
      { profile: { ...userProfile, UserUUID: undefined } },
    );
    expect(written.body.errors).toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."SetUserProfile"'),
      [
        "alice",
        "Alice",
        "Example",
        "Al",
        "Programme manager",
        "Runs the scoreboard.",
        "en-US",
        "+1 555 0134",
        "San Francisco, CA",
        "alice.example",
        "",
        "",
        "",
        "github.com/alice",
        true,
        false,
      ],
    );
  });

  it("rejects a profile field it could not store, naming every one of them", async () => {
    const response = await execute(
      `mutation Save($profile: UserProfileInput!) {
        updateProfile(profile: $profile) { Designation }
      }`,
      {
        profile: {
          ...userProfile,
          UserUUID: undefined,
          Website: "not a website",
          Biography: "b".repeat(2001),
        },
      },
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(response.body.errors[0].message).toContain("Website");
    expect(response.body.errors[0].message).toContain("Biography");
    expect(
      query.mock.calls.some(([sql]) => sql.includes("SetUserProfile")),
    ).toBe(false);
  });

  // First sign-in: the subject is unknown, so the account is created from the
  // verified claims rather than from anything the client sent.
  it("provisions an account the first time a verified subject appears", async () => {
    query.mockImplementation(async (sql) =>
      sql.includes('WHERE "SubjectId"')
        ? []
        : sql.includes('"ProvisionUser"')
          ? [account]
          : [profile],
    );
    const response = await execute("{ me { LoginName } }");
    expect(response.body.errors).toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."ProvisionUser"'),
      ["subject-alice", "alice", "Alice Example", "alice@example.test"],
    );
  });

  // Keycloak owns the username and the address; this API keeps a copy. When the
  // copy is stale the request refreshes it, and when it is not it does not write.
  it("refreshes a renamed account, and writes nothing when nothing changed", async () => {
    await execute("{ me { LoginName } }");
    expect(
      query.mock.calls.some(([sql]) => sql.includes("ProvisionUser")),
    ).toBe(false);

    const renamed = await sign({ preferred_username: "alice.example" });
    await execute("{ me { LoginName } }", {}, `Bearer ${renamed}`);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dbo."ProvisionUser"'),
      ["subject-alice", "alice.example", "Alice Example", "alice@example.test"],
    );
  });

  it.each(["", "Basic abc", "Bearer garbage"])(
    "rejects missing or invalid credentials: %s",
    async (header) => {
      const response = await execute("{ organizations { Name } }", {}, header);
      expect(response.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
      expect(query).not.toHaveBeenCalled();
    },
  );

  it("rejects a token signed by anything but the realm", async () => {
    const impostor = (await generateKeyPair("RS256", { extractable: true }))
      .privateKey;
    const forged = await new SignJWT({
      typ: "Bearer",
      preferred_username: "alice",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setSubject("subject-alice")
      .setIssuer(issuer)
      .setAudience("main-api")
      .setExpirationTime("1h")
      .sign(impostor);
    const response = await execute("{ me { Name } }", {}, `Bearer ${forged}`);
    expect(response.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a disabled or deleted account before querying domain data", async () => {
    query.mockResolvedValue([]);
    const response = await execute("{ me { Name } }");
    expect(response.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("validates UUIDs before querying feature data", async () => {
    const response = await execute(
      '{ teams(organizationId: "not-a-uuid") { Name } }',
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 101])("rejects a list limit of %s", async (limit) => {
    const response = await execute(
      `{ organizations(limit: ${limit}) { Name } }`,
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("passes pagination to PostgreSQL", async () => {
    const response = await execute(
      "{ organizations(limit: 10, offset: 20) { Name } }",
    );
    expect(response.body.errors).toBeUndefined();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $2 OFFSET $3"),
      ["alice", 10, 20, false],
    );
  });
  it("rejects blank organization names", async () => {
    const response = await execute(
      'mutation { addOrganization(name: "  ") { Name } }',
    );
    expect(response.body.errors[0].extensions.code).toBe("BAD_REQUEST");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("denies team creation without organization ownership", async () => {
    query.mockImplementation(async (sql) =>
      sql.includes('WHERE "SubjectId"') ? [account] : [{ allowed: false }],
    );
    const response = await execute(
      `mutation { addTeam(organizationId: "${orgId}", name: "X") { Name } }`,
    );
    expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    expect(query.mock.calls.some(([sql]) => sql.includes('"AddTeam"'))).toBe(
      false,
    );
  });
  it("does not leak database details or stack traces", async () => {
    query.mockRejectedValue(new Error("password=secret; SELECT private_data"));
    const response = await execute("{ me { Name } }");
    expect(response.body.errors[0].message).toBe("Internal server error");
    expect(JSON.stringify(response.body)).not.toMatch(
      /password|private_data|stacktrace/,
    );
  });
  it("rejects excessive aliases before accessing the database", async () => {
    const aliases = Array.from(
      { length: 101 },
      (_, i) => `a${i}: me { Name }`,
    ).join(" ");
    const response = await execute(`{ ${aliases} }`);
    expect(response.body.errors[0].extensions.code).toBe(
      "GRAPHQL_VALIDATION_FAILED",
    );
    expect(query).not.toHaveBeenCalled();
  });
  it("rejects HTTP request batching", async () => {
    const response = await request(app.getHttpServer())
      .post("/graphql")
      .send([{ query: "{ me { Name } }" }]);
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  // Nothing in the schema is public. The guard is global, so a new resolver is
  // protected the day it is written -- this reads the built schema rather than
  // a list kept by hand, so the day someone marks one @Public by accident, or
  // adds a feature module that forgets the guard, this fails.
  it("requires a token on every operation the schema exposes", async () => {
    const schema = app.get(GraphQLSchemaHost).schema;
    const roots = [schema.getQueryType(), schema.getMutationType()].filter(
      (root) => !!root,
    );
    // A literal of the right shape for any argument the schema declares.
    // Input objects are written out field by field, because an operation
    // whose argument will not even parse fails validation before the guard
    // this test is about ever runs.
    const placeholder = (type: unknown): string => {
      const name = String(type).replace(/[[\]!]/g, "");
      const declared = schema.getType(name);
      if (isInputObjectType(declared)) {
        const fields = Object.values(declared.getFields())
          .filter(
            (field) =>
              String(field.type).endsWith("!") &&
              field.defaultValue === undefined,
          )
          .map((field) => `${field.name}: ${placeholder(field.type)}`);
        return `{ ${fields.join(", ")} }`;
      }
      return name === "Boolean" ? "false" : name === "Int" ? "1" : `"${orgId}"`;
    };
    const operations = roots.flatMap((root) =>
      Object.values(root.getFields()).map((field) => {
        const args = field.args
          .filter(
            (argument) =>
              String(argument.type).endsWith("!") &&
              argument.defaultValue === undefined,
          )
          .map((argument) => `${argument.name}: ${placeholder(argument.type)}`);
        const selection = `${field.name}${args.length ? `(${args.join(", ")})` : ""}`;
        return {
          name: field.name,
          document: `${root.name.toLowerCase()} { ${selection} { __typename } }`,
        };
      }),
    );

    // A schema that lost its fields would pass every assertion below.
    expect(operations.length).toBeGreaterThan(20);
    for (const { name, document } of operations) {
      const response = await execute(document, {}, "");
      expect({
        name,
        code: response.body.errors?.[0]?.extensions?.code,
      }).toEqual({ name, code: "UNAUTHENTICATED" });
      // A refusal that still resolved the field would report both.
      expect({ name, value: response.body.data?.[name] ?? null }).toEqual({
        name,
        value: null,
      });
    }
    // Refused before anything reads or writes, not after.
    expect(query).not.toHaveBeenCalled();
  });

  it("exposes liveness independently of database readiness", async () => {
    expect(
      (await request(app.getHttpServer()).get("/health/live")).status,
    ).toBe(200);
    expect(
      (await request(app.getHttpServer()).get("/health/ready")).status,
    ).toBe(200);
    query.mockRejectedValue(new Error("offline"));
    expect(
      (await request(app.getHttpServer()).get("/health/live")).status,
    ).toBe(200);
    expect(
      (await request(app.getHttpServer()).get("/health/ready")).status,
    ).toBe(503);
  });
  it("returns 404 for the retired feature URL", async () => {
    expect(
      (
        await request(app.getHttpServer())
          .post("/v1/users")
          .send({ query: "{ get { Name } }" })
      ).status,
    ).toBe(404);
  });
});
