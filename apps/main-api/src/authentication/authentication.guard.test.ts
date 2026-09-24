import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { DatabaseService } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import type { AuthenticatedRequest } from "./authentication.decorators.js";
import type {
  TokenVerifierService,
  VerifiedIdentity,
} from "./token-verifier.service.js";

/*
 * The guard in front of every operation in the schema. It is the one place
 * a token becomes a person: everything downstream is handed a principal and
 * never sees a header.
 *
 * What is worth pinning here is the part that is not the token -- the token
 * itself is verified in keycloak.service.test.ts. This is about what happens
 * after: which account the subject maps to, when that account is written,
 * what happens to a disabled one, and how many times any of it runs for a
 * single HTTP request with several root fields in it.
 */

/* The class and handler the guard asks the reflector about. A resolver, near
 * enough: what matters is that they are the same two every time. */
class Resolver {
  query() {
    return "a result";
  }
}

const identity: VerifiedIdentity = {
  subjectId: "subject-alice",
  loginName: "alice",
  name: "Alice Example",
  email: "alice@example.test",
  emailVerified: true,
  /* The provider's session. One login is one session, so this is what the
   * security log deduplicates a login on -- see dbo.LogLoginEvent. */
  sessionId: "session-one",
  /* When they actually authenticated. Keycloak leaves this out of a direct
   * grant, so it says when a login happened and never whether one did. */
  authenticatedAt: new Date("2026-01-01T00:00:00.000Z"),
  issuedAt: new Date("2026-01-01T00:00:00.000Z"),
};

/* A token nobody logged in for: a service account, a client-credentials grant.
 * Nothing is recorded for one, so it is also the identity to reach for when a
 * case is about the account lookup and not about the login. */
const machine: VerifiedIdentity = { ...identity, sessionId: null };

const verifying = (of: VerifiedIdentity) =>
  jest.fn<TokenVerifierService["verify"]>().mockResolvedValue(of);

const account = {
  UserUUID: "user-id",
  Name: "Alice Example",
  LoginName: "alice",
  Email: "alice@example.test",
  IsEnabled: true,
};

function setup({
  isPublic = false,
  rows = [[account]],
  verify = jest
    .fn<TokenVerifierService["verify"]>()
    .mockResolvedValue(identity),
  header = "Bearer a-token",
}: {
  isPublic?: boolean;
  rows?: unknown[][];
  verify?: jest.Mock<TokenVerifierService["verify"]>;
  /* `null` is a request with no Authorization header at all, which is not
   * the same as one carrying an empty string. */
  header?: string | null;
} = {}) {
  const query = jest.fn<DatabaseService["query"]>();
  for (const answer of rows) query.mockResolvedValueOnce(answer as never);
  query.mockResolvedValue([] as never);

  const request = {
    headers: { authorization: header ?? undefined },
  } as AuthenticatedRequest;
  /* A resolver call as GraphQL makes one: root, arguments, context, info.
   * The request lives in the third of them, which is where the guard puts
   * the principal and where `@CurrentUser()` reads it back. */
  const context = {
    getType: () => "graphql",
    getArgs: () => [undefined, {}, { req: request }, undefined],
    getClass: () => Resolver,
    getHandler: () => Resolver.prototype.query,
  } as unknown as ExecutionContext;

  const guard = new AuthenticationGuard(
    { getAllAndOverride: () => isPublic } as unknown as Reflector,
    { verify } as unknown as TokenVerifierService,
    { query } as unknown as DatabaseService,
  );

  return { guard, context, request, query, verify };
}

describe("operations that need no token", () => {
  it("lets a public operation through without looking at the header", async () => {
    const { guard, context, verify, query } = setup({
      isPublic: true,
      header: null,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});

describe("the token on the request", () => {
  it.each([
    ["nothing at all", null],
    ["a header with no scheme", "a-token"],
    ["the wrong scheme", "Basic a-token"],
    ["a scheme and no token", "Bearer "],
  ])("refuses %s", async (_case, header) => {
    const { guard, context } = setup({ header });

    await expect(guard.canActivate(context)).rejects.toThrow(
      "A Bearer token is required",
    );
  });

  it("accepts the scheme however it was capitalized", async () => {
    const { guard, context, verify } = setup({ header: "bearer a-token" });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith("a-token");
  });
});

describe("the account behind the subject", () => {
  it("puts the principal on the request for the resolvers to read", async () => {
    const { guard, context, request } = setup();

    await guard.canActivate(context);

    expect(request.principal).toEqual({
      userId: "user-id",
      loginName: "alice",
    });
  });

  // The common sign-in is somebody who has changed nothing, and it should
  // cost one indexed read rather than a write.
  it("writes nothing when the account already matches the token", async () => {
    const { guard, context, query } = setup({ verify: verifying(machine) });

    await guard.canActivate(context);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('FROM dbo."Users"');
  });

  it("provisions an account the first time a verified subject appears", async () => {
    const { guard, context, query } = setup({ rows: [[], [account]] });

    await guard.canActivate(context);

    expect(query.mock.calls[1]?.[0]).toContain('"ProvisionUser"');
    // The fifth parameter is the token's "email_verified" claim. It is what
    // dbo.ProvisionUser marks the primary dbo.UserEmails row with, so a
    // login with an address the provider has confirmed does not ask its owner
    // to confirm it a second time.
    expect(query.mock.calls[1]?.[1]).toEqual([
      "subject-alice",
      "alice",
      "Alice Example",
      "alice@example.test",
      true,
      // When the token was minted. A token issued before somebody chose a new
      // sign-in address still carries the old one, and dbo.ProvisionUser needs
      // to know that so the change does not undo itself on the next request.
      new Date("2026-01-01T00:00:00.000Z"),
    ]);
  });

  it.each([
    ["renamed", { ...account, Name: "Alice Older" }],
    ["renamed their login", { ...account, LoginName: "alice.example" }],
    ["changed address", { ...account, Email: "new@example.test" }],
  ])("refreshes an account the provider has since %s", async (_case, stale) => {
    const { guard, context, query } = setup({ rows: [[stale], [account]] });

    await guard.canActivate(context);

    expect(query.mock.calls[1]?.[0]).toContain('"ProvisionUser"');
  });

  // A provider not telling us a name is not a provider telling us the name has
  // changed, and re-provisioning on every request would be a write per call.
  it("leaves an account alone when the token carries no name", async () => {
    const { guard, context, query } = setup({
      verify: verifying({ ...machine, name: null }),
    });

    await guard.canActivate(context);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["is disabled", [[{ ...account, IsEnabled: false }]]],
    ["could not be provisioned", [[], []]],
  ])("refuses a caller whose account %s", async (_case, rows) => {
    const { guard, context } = setup({ rows });

    await expect(guard.canActivate(context)).rejects.toThrow(
      "User is unavailable",
    );
  });
});

describe("one request with several root fields in it", () => {
  // GraphQL resolves root fields in parallel and the guard runs for each of
  // them. Without the memo on the request that is one token verification and
  // one database read per field.
  it("verifies the token and reads the account once", async () => {
    const { guard, context, verify, query } = setup({
      verify: verifying(machine),
    });

    await Promise.all([
      guard.canActivate(context),
      guard.canActivate(context),
      guard.canActivate(context),
    ]);

    expect(verify).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

/*
 * Recording a login, which this guard is the only place in the product that
 * can: Keycloak does the authenticating and this API only ever meets the token
 * afterwards. So the request path is where a login becomes visible, and the
 * request is also the only thing that knows which browser it came from.
 *
 * The rule underneath all of it: a login that worked must not be turned into a
 * failure by a log row that did not.
 */
describe("writing the login into the security log", () => {
  const loggingCalls = (query: jest.Mock<DatabaseService["query"]>) =>
    query.mock.calls.filter((call) =>
      String(call[0]).includes("LogLoginEvent"),
    );

  /* A second HTTP request, which is the only thing that reaches this code
   * twice: the guard memoizes its whole answer on the request object, so
   * calling it again with the same one is the parallel-root-fields case and
   * never authenticates a second time. Clearing that memo is what a new
   * request looks like from here. */
  const nextRequest = (request: AuthenticatedRequest) => {
    request.authentication = undefined;
  };

  /* The account lookup answering every time rather than once, which is what a
   * second request needs: `setup` queues its rows, and a case that
   * authenticates twice would otherwise find no account the second time. */
  const standingAccount = (query: jest.Mock<DatabaseService["query"]>) =>
    query.mockImplementation((sql: string) =>
      sql.includes("LogLoginEvent")
        ? (Promise.resolve([]) as never)
        : (Promise.resolve([account]) as never),
    );

  it("records the login, with the device the request came from", async () => {
    const { guard, context, query, request } = setup();
    request.headers["user-agent"] =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

    await guard.canActivate(context);

    expect(loggingCalls(query)[0]?.[1]).toEqual([
      "alice",
      "session-one",
      "New login on Mac OS.",
      "Mac OS",
      // No location: working one out means an IP address lookup, and that is
      // not a decision to make by accident inside a feature.
      null,
      new Date("2026-01-01T00:00:00.000Z"),
    ]);
  });

  /* Guessing a name somebody does not recognize is what makes them report a
   * login that was theirs, so an unreadable agent says nothing instead. */
  it("says only that there was a login when the device is unreadable", async () => {
    const { guard, context, query } = setup();

    await guard.canActivate(context);

    expect(loggingCalls(query)[0]?.[1]?.slice(2, 4)).toEqual([
      "New login.",
      null,
    ]);
  });

  /* A token nobody logged in for is not a login. Recording one would put a row
   * on somebody's page every time a machine called the API. */
  it("records nothing for a token carrying no session", async () => {
    const { guard, context, query } = setup({ verify: verifying(machine) });

    await guard.canActivate(context);

    expect(loggingCalls(query)).toHaveLength(0);
  });

  /* Every request in a session carries the same authentication time. Without
   * the memo this would ask the database to deduplicate the same login on
   * every single request for as long as the session lasts. */
  it("asks once per session rather than once per request", async () => {
    const { guard, context, query, request } = setup();
    standingAccount(query);

    await guard.canActivate(context);
    nextRequest(request);
    await guard.canActivate(context);
    nextRequest(request);
    await guard.canActivate(context);

    expect(loggingCalls(query)).toHaveLength(1);
  });

  it("records a later login as a new one", async () => {
    const { guard, context, query, request, verify } = setup();
    standingAccount(query);

    await guard.canActivate(context);
    verify.mockResolvedValue({ ...identity, sessionId: "session-two" });
    nextRequest(request);
    await guard.canActivate(context);

    expect(loggingCalls(query)).toHaveLength(2);
  });

  /* Somebody whose login worked is signed in. Answering 500 because a log row
   * could not be written would lock them out over bookkeeping. */
  it("lets the request through when the log cannot be written", async () => {
    const { guard, context, query, request } = setup();
    query.mockImplementation((sql: string) =>
      sql.includes("LogLoginEvent")
        ? Promise.reject(new Error("the database fell over"))
        : (Promise.resolve([account]) as never),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.principal).toEqual({
      userId: "user-id",
      loginName: "alice",
    });
  });

  /* The memo is a cache of "already written", not the rule. A write that never
   * landed must be attempted again rather than remembered as done. */
  it("does not remember a login it failed to write", async () => {
    const { guard, context, query, request } = setup();
    query.mockImplementation((sql: string) =>
      sql.includes("LogLoginEvent")
        ? Promise.reject(new Error("the database fell over"))
        : (Promise.resolve([account]) as never),
    );

    await guard.canActivate(context);
    nextRequest(request);
    await guard.canActivate(context);

    expect(loggingCalls(query)).toHaveLength(2);
  });
});
