import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { DatabaseService } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import type { AuthenticatedRequest } from "./authentication.decorators.js";
import type { KeycloakService, VerifiedIdentity } from "./keycloak.service.js";

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
};

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
  verify = jest.fn<KeycloakService["verify"]>().mockResolvedValue(identity),
  header = "Bearer a-token",
}: {
  isPublic?: boolean;
  rows?: unknown[][];
  verify?: jest.Mock<KeycloakService["verify"]>;
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
    { verify } as unknown as KeycloakService,
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

  it("accepts the scheme however it was capitalised", async () => {
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
    const { guard, context, query } = setup();

    await guard.canActivate(context);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('FROM dbo."Users"');
  });

  it("provisions an account the first time a verified subject appears", async () => {
    const { guard, context, query } = setup({ rows: [[], [account]] });

    await guard.canActivate(context);

    expect(query.mock.calls[1]?.[0]).toContain('"ProvisionUser"');
    expect(query.mock.calls[1]?.[1]).toEqual([
      "subject-alice",
      "alice",
      "Alice Example",
      "alice@example.test",
    ]);
  });

  it.each([
    ["renamed", { ...account, Name: "Alice Older" }],
    ["renamed their login", { ...account, LoginName: "alice.example" }],
    ["changed address", { ...account, Email: "new@example.test" }],
  ])("refreshes an account Keycloak has since %s", async (_case, stale) => {
    const { guard, context, query } = setup({ rows: [[stale], [account]] });

    await guard.canActivate(context);

    expect(query.mock.calls[1]?.[0]).toContain('"ProvisionUser"');
  });

  // Keycloak not telling us a name is not Keycloak telling us the name has
  // changed, and re-provisioning on every request would be a write per call.
  it("leaves an account alone when the token carries no name", async () => {
    const { guard, context, query } = setup({
      verify: jest
        .fn<KeycloakService["verify"]>()
        .mockResolvedValue({ ...identity, name: null }),
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
    const { guard, context, verify, query } = setup();

    await Promise.all([
      guard.canActivate(context),
      guard.canActivate(context),
      guard.canActivate(context),
    ]);

    expect(verify).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
