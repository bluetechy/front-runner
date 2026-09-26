import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { KeycloakAdminService } from "./keycloak-admin.service.js";

/*
 * IdentityAdminService answered against Keycloak's admin API: half of what
 * "make this address my login" means -- the other half is
 * dbo.SetPrimaryUserEmail -- the whole of what making an account on the site's
 * own sign-up form means, and the two ends of a password reset.
 *
 * Realms, /admin paths and "emailVerified" are all only in this file and its
 * implementation, which is the point: every other test in this API drives the
 * port instead, and would pass unchanged against another provider.
 *
 * Two things here are worth more than the rest. A Keycloak that cannot be
 * reached has to read as an outage rather than as a refused change, because a
 * caller told "refused" stops trying. And the admin token is cached, so this
 * does not make two round trips every time it makes one.
 */

const settings: Record<string, string> = {
  KEYCLOAK_ADMIN_URL: "http://keycloak-idp:8080",
  KEYCLOAK_REALM: "front-runner",
  KEYCLOAK_CLIENT_ID: "main-api",
  KEYCLOAK_CLIENT_SECRET: "a-secret-long-enough-to-pass",
};

const config = {
  getOrThrow: (key: string) => settings[key],
} as unknown as ConfigService;

const ok = (body: unknown = {}) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const failed = (status: number, body: unknown = {}) =>
  ({ ok: false, status, json: async () => body }) as Response;

const created = () =>
  ({ ok: true, status: 201, json: async () => ({}) }) as Response;

const token = (expiresIn = 300) =>
  ok({ access_token: "an-admin-token", expires_in: expiresIn });

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("changing the address an account signs in with", () => {
  it("asks for a token and then writes the user", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setEmail("subject-marcus", "marcus.work@example.test");

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]!;
    expect(String(tokenUrl)).toContain(
      "/realms/front-runner/protocol/openid-connect/token",
    );
    expect(String(tokenInit?.body)).toContain("grant_type=client_credentials");

    const [userUrl, userInit] = fetchMock.mock.calls[1]!;
    expect(String(userUrl)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus",
    );
    expect(userInit?.method).toBe("PUT");
  });

  // Set true in the same call, deliberately: this is only ever reached for an
  // address the database already refused to promote unless it was verified,
  // so the link has been followed and asking again would be asking twice.
  it("marks the address verified as it sets it", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setEmail("subject-marcus", "marcus.work@example.test");

    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({
      email: "marcus.work@example.test",
      emailVerified: true,
    });
  });

  it("presents the token it was given", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setEmail("subject-marcus", "marcus.work@example.test");

    const headers = fetchMock.mock.calls[1]![1]?.headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe("Bearer an-admin-token");
  });
});

describe("the admin token", () => {
  it("is reused rather than fetched again for every call", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setEmail("subject-marcus", "one@example.test");
    await service.setEmail("subject-marcus", "two@example.test");

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // A token good for ten seconds should not be spent on a call that will
  // outlive it, so anything inside the headroom is fetched again.
  it("is fetched again when it is about to expire", async () => {
    fetchMock
      .mockResolvedValueOnce(token(10))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(token(300))
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setEmail("subject-marcus", "one@example.test");
    await service.setEmail("subject-marcus", "two@example.test");

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  // A revoked token in hand would fail every call after this one.
  it("is dropped when Keycloak refuses it, so the next call fetches a new one", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(failed(401))
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await expect(
      service.setEmail("subject-marcus", "one@example.test"),
    ).rejects.toThrow();
    await service.setEmail("subject-marcus", "two@example.test");

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("when Keycloak does not cooperate", () => {
  // The assertion that matters most: a caller told the change was refused
  // stops trying, and one told the service is down knows to come back.
  it("reads an unreachable server as an outage rather than a refusal", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setEmail("subject-marcus", "marcus.work@example.test"),
    ).rejects.toThrow("unavailable");
  });

  it("reads a refused token grant as an outage too", async () => {
    fetchMock.mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setEmail("subject-marcus", "marcus.work@example.test"),
    ).rejects.toThrow("unavailable");
  });

  it("refuses a token grant that answers without a token", async () => {
    fetchMock.mockResolvedValueOnce(ok({ expires_in: 300 }));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setEmail("subject-marcus", "marcus.work@example.test"),
    ).rejects.toThrow("unavailable");
  });

  // The database's unique key should have caught this first, so a 409 means
  // the two have drifted. Still worth a sentence somebody can act on.
  it("says so when Keycloak already has the address on another account", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(409));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setEmail("subject-marcus", "marcus.work@example.test"),
    ).rejects.toThrow("already has that email address");
  });
});

/*
 * Making an account. Keycloak has no endpoint a browser may call to register
 * somebody, so the sign-up form's account is made here, by the one account in
 * this system allowed to make one.
 */
describe("making an account", () => {
  const account = {
    username: "marcus",
    email: "marcus@example.test",
    firstName: "Marcus",
    lastName: "Wright",
    password: "a-good-enough-password",
  };

  it("posts the account to the realm, with its password", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(created());
    const service = new KeycloakAdminService(config);

    await service.createUser(account);

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users",
    );
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "marcus",
      email: "marcus@example.test",
      firstName: "Marcus",
      lastName: "Wright",
      enabled: true,
      emailVerified: false,
      credentials: [
        { type: "password", value: "a-good-enough-password", temporary: false },
      ],
    });
  });

  // Enabled, so the dialog can sign in with the password somebody just chose;
  // not verified, because nothing has been proved about the address yet; and
  // not temporary, or Keycloak would ask for a new password immediately.
  it("makes an account that can be signed in with straight away", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(created());
    const service = new KeycloakAdminService(config);

    await service.createUser(account);

    const body = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body));
    expect(body.enabled).toBe(true);
    expect(body.emailVerified).toBe(false);
    expect(body.credentials[0].temporary).toBe(false);
  });

  // Keycloak answers 409 for a username and for an address already on the
  // realm and does not say which. Saying which would answer "does this person
  // have an account here" to anybody who asked.
  it("says the name or the address is taken, without saying which", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(409));
    const service = new KeycloakAdminService(config);

    await expect(service.createUser(account)).rejects.toThrow(
      "username or email address is already taken",
    );
  });

  // The transport passes BAD_REQUEST, FORBIDDEN and SERVICE_UNAVAILABLE
  // through and collapses everything else into "Internal server error". A
  // sentence somebody has to act on has to arrive as one of the three, and a
  // conflict is the caller's to fix rather than an outage, so this is
  // asserted rather than left to the name of the exception.
  it.each([
    ["a name already taken", failed(409)],
    ["details the realm will not have", failed(400)],
  ])(
    "answers %s as a bad request, so the sentence reaches the form",
    async (_, refusal) => {
      fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(refusal);
      const service = new KeycloakAdminService(config);

      await expect(service.createUser(account)).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  // A realm password policy is the likely 400, and Keycloak's own sentence
  // names the rule that was broken. Ours could not.
  it("passes on what Keycloak said when it refused the details", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        failed(400, { errorMessage: "invalid password: minimum length 12" }),
      );
    const service = new KeycloakAdminService(config);

    await expect(service.createUser(account)).rejects.toThrow(
      "minimum length 12",
    );
  });

  it("still refuses when a 400 carries nothing worth reading", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(400));
    const service = new KeycloakAdminService(config);

    await expect(service.createUser(account)).rejects.toThrow(
      "refused those details",
    );
  });

  it("reads a server that cannot be reached as an outage", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const service = new KeycloakAdminService(config);

    await expect(service.createUser(account)).rejects.toThrow("unavailable");
  });

  it("drops a token Keycloak refused, so the next call fetches a new one", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(failed(403))
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(created());
    const service = new KeycloakAdminService(config);

    await expect(service.createUser(account)).rejects.toThrow();
    await service.createUser(account);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

/*
 * Finding an account, and setting its password: the two ends of a reset.
 *
 * The finding is the careful half. It searches exactly, twice, and answers
 * nobody for anything ambiguous, because a partial match here would reset a
 * password on an account somebody did not name.
 */
describe("finding the account somebody named", () => {
  const found = [
    {
      id: "subject-marcus",
      username: "marcus",
      email: "marcus@example.test",
      firstName: "Marcus",
      enabled: true,
    },
  ];

  it("looks for the username first, exactly", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok(found));
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("marcus")).resolves.toEqual({
      subjectId: "subject-marcus",
      username: "marcus",
      email: "marcus@example.test",
      firstName: "Marcus",
    });

    const [url] = fetchMock.mock.calls[1]!;
    expect(String(url)).toContain("/admin/realms/front-runner/users?");
    expect(String(url)).toContain("username=marcus");
    expect(String(url)).toContain("exact=true");
  });

  // The form asks for "username or email address" because Keycloak accepts
  // either at a login prompt.
  it("looks for the address when nothing answered to the name", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok(found));
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("marcus@example.test")).resolves.toEqual(
      expect.objectContaining({ subjectId: "subject-marcus" }),
    );
    expect(String(fetchMock.mock.calls[2]![0])).toContain(
      "email=marcus%40example.test",
    );
  });

  it("answers nobody when neither search found anything", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("nobody")).resolves.toBeNull();
  });

  // "Which of these two did you mean" is not a question this flow can ask.
  it("answers nobody when more than one account came back", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([found[0], { ...found[0], id: "another" }]))
      .mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("marcus")).resolves.toBeNull();
  });

  // A reset link is an invitation back in, and there is nowhere to send one
  // for an account with no address on it.
  it.each([
    ["a disabled account", { ...found[0], enabled: false }],
    ["an account with no address", { ...found[0], email: "" }],
  ])("answers nobody for %s", async (_, row) => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([row]))
      .mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("marcus")).resolves.toBeNull();
  });

  it("does not search at all for an empty name", async () => {
    const service = new KeycloakAdminService(config);

    await expect(service.findAccount("   ")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the account a spent token named, by its subject id", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok(found[0]));
    const service = new KeycloakAdminService(config);

    await expect(service.account("subject-marcus")).resolves.toEqual(
      expect.objectContaining({ username: "marcus" }),
    );
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus",
    );
  });

  // The account was deleted between the mail going out and the link being
  // followed.
  it("answers nobody for a subject the realm no longer has", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(404));
    const service = new KeycloakAdminService(config);

    await expect(service.account("subject-gone")).resolves.toBeNull();
  });
});

describe("setting a password", () => {
  it("puts the new password on the account, permanently", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setPassword("subject-marcus", "a-good-enough-password");

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/reset-password",
    );
    expect(init?.method).toBe("PUT");
    // Not temporary: somebody who has just typed a new password twice has
    // chosen one, and a temporary credential would put Keycloak's own
    // "update your password" page in front of them at the next login.
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "password",
      value: "a-good-enough-password",
      temporary: false,
    });
  });

  // A realm password policy is the likely 400, and its sentence names the
  // rule that was broken. It has to arrive as a bad request to reach the page
  // at all: see the note on making an account.
  it("passes on what Keycloak said, as a bad request", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        failed(400, { errorMessage: "invalid password: minimum length 12" }),
      );
    const service = new KeycloakAdminService(config);

    await expect(
      service.setPassword("subject-marcus", "short"),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("minimum length 12"),
    });
  });

  it("reads a server that cannot be reached as an outage", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setPassword("subject-marcus", "a-good-enough-password"),
    ).rejects.toThrow("unavailable");
  });
});

/*
 * Checking a password somebody typed, which Keycloak has no endpoint for: it
 * is asked to authenticate and the session is thrown away. Everything here is
 * about that second half, because a check that left a session behind every
 * time somebody opened the card would be a leak rather than a check.
 */
describe("checking that a password is the account's own", () => {
  const grant = () =>
    ok({ access_token: "a-token", refresh_token: "a-refresh-token" });

  it("asks for a password grant on this API's own confidential client", async () => {
    fetchMock.mockResolvedValueOnce(grant()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "letmein")).resolves.toBe(
      true,
    );

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/realms/front-runner/protocol/openid-connect/token",
    );
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("grant_type")).toBe("password");
    // The realm binds "main-api" a direct grant flow with no second factor in
    // it, which is the only way this check can pass for an account that has
    // an authenticator app on it: the browser's client would refuse the grant
    // without a code, and the question being asked here is about a password.
    // The secret goes with it, and that is what keeps the arrangement safe --
    // nothing but this process can reach that flow.
    expect(body.get("client_id")).toBe("main-api");
    expect(body.get("client_secret")).toBe("a-secret-long-enough-to-pass");
    expect(body.get("username")).toBe("marcus");
    expect(body.get("password")).toBe("letmein");
  });

  // Never an admin call, so it never touches the cached admin token: this is
  // the account's own credentials being presented, by name.
  it("makes no admin call at all", async () => {
    fetchMock.mockResolvedValueOnce(grant()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.verifyPassword("marcus", "letmein");

    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes("/admin/")),
    ).toEqual([]);
  });

  /* The assertion this block exists for. A grant that was allowed to stand
   * would open a session on the realm every time somebody opened the card. */
  it("spends the session it just opened", async () => {
    fetchMock.mockResolvedValueOnce(grant()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.verifyPassword("marcus", "letmein");

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/realms/front-runner/protocol/openid-connect/logout",
    );
    const logout = new URLSearchParams(String(init?.body));
    expect(logout.get("refresh_token")).toBe("a-refresh-token");
    // The session belongs to a confidential client, which is asked to prove
    // it is itself even to give one back.
    expect(logout.get("client_id")).toBe("main-api");
    expect(logout.get("client_secret")).toBe("a-secret-long-enough-to-pass");
  });

  /* **Keycloak 26 answers 400 for a refused grant, not 401.** Verified
   * against 26.7.4, which returns 400 with error "invalid_grant" for a wrong
   * password, an account that is not there and a disabled account alike. Both
   * are read, because 401 is what OAuth's own examples show and what another
   * provider may well answer. */
  it("reads a 400 invalid_grant as a wrong password, the way Keycloak sends it", async () => {
    fetchMock.mockResolvedValueOnce(
      failed(400, {
        error: "invalid_grant",
        error_description: "Invalid user credentials",
      }),
    );
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "not-it")).resolves.toBe(
      false,
    );
  });

  it("reads a 401 as a wrong password too", async () => {
    fetchMock.mockResolvedValueOnce(failed(401));
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "not-it")).resolves.toBe(
      false,
    );
  });

  /* A 400 that is not a refused credential is a client this realm will not
   * run the grant for -- a flow override that was never applied, a client
   * whose direct grants are off. That is an outage in the deployment rather
   * than a wrong password, and saying "that is not your password" to it would
   * send everybody looking for a password they already have. */
  it("reads a 400 that is not invalid_grant as an outage", async () => {
    fetchMock.mockResolvedValueOnce(
      failed(400, { error: "unauthorized_client" }),
    );
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "letmein")).rejects.toThrow(
      "could not check that password",
    );
  });

  /* The difference that matters most here. Telling somebody their own
   * password is wrong when the truth is a broken realm sends them looking for
   * a password they already have. */
  it("reads anything else as an outage rather than a wrong password", async () => {
    fetchMock.mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "letmein")).rejects.toThrow(
      "could not check that password",
    );
  });

  it("reads a server that cannot be reached as an outage too", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "letmein")).rejects.toThrow(
      "unavailable",
    );
  });

  // The password was right, which is what was asked. A logout that would not
  // go through is the realm's idle timeout's problem, not the caller's.
  it("still says the password was right when the logout fails", async () => {
    fetchMock
      .mockResolvedValueOnce(grant())
      .mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const service = new KeycloakAdminService(config);

    await expect(service.verifyPassword("marcus", "letmein")).resolves.toBe(
      true,
    );
  });
});

describe("when the password was last set", () => {
  const credentials = (createdDate: unknown) => [
    { type: "otp", createdDate: 1 },
    { type: "password", createdDate },
  ];

  it("reads it off the account's password credential", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok(credentials(1758404520000)));
    const service = new KeycloakAdminService(config);

    await expect(service.passwordChangedAt("subject-marcus")).resolves.toEqual(
      new Date(1758404520000),
    );

    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/credentials",
    );
  });

  /* A line on a card. A card that refused to draw because a date was missing
   * would be worse than one that leaves the line out, so every way this can
   * come to nothing comes to null rather than to an exception. */
  it.each([
    ["the account has no password credential", ok([{ type: "otp" }])],
    ["the stamp is not a number", ok(credentials("last tuesday"))],
    ["the answer is not a list at all", ok({ error: "no" })],
    ["Keycloak refuses the read", failed(403)],
  ])("answers with no date when %s", async (_, response) => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(response);
    const service = new KeycloakAdminService(config);

    await expect(service.passwordChangedAt("subject-marcus")).resolves.toBe(
      null,
    );
  });
});

describe("ending every session but one", () => {
  const sessions = () => ok([{ id: "session-old" }, { id: "session-now" }]);

  /* Keycloak's own logout-the-user endpoint ends all of them, this one
   * included. Somebody who has just changed their password correctly should
   * not be thrown out of the browser they did it in. */
  it("leaves the session the request came in on alone", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(sessions())
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await expect(
      service.endOtherSessions("subject-marcus", "session-now"),
    ).resolves.toBe(1);

    const deletes = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "DELETE",
    );
    expect(deletes).toHaveLength(1);
    expect(String(deletes[0]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/sessions/session-old",
    );
  });

  // A request with no session on its token -- a machine's -- keeps nothing
  // back, because there is nothing of its own to keep.
  it("ends all of them when there is no session to keep", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(sessions())
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await expect(
      service.endOtherSessions("subject-marcus", null),
    ).resolves.toBe(2);
  });

  /* The list is a moment old by the time this reads it, so a session that has
   * already gone is the ordinary case rather than a failure. The count is
   * what was actually ended. */
  it("counts what it ended and skips what it could not", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(sessions())
      .mockResolvedValueOnce(failed(404))
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await expect(
      service.endOtherSessions("subject-marcus", null),
    ).resolves.toBe(1);
  });

  it("reads a provider that will not list them as an outage", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.endOtherSessions("subject-marcus", "session-now"),
    ).rejects.toThrow("would not say what sessions are open");
  });
});

/*
 * The one read here that is not about an account somebody named: what the realm
 * refused. Keycloak's own event log is the only place a failed login exists,
 * because a refused password mints no token and the request path never sees it.
 */
describe("reading back the logins the realm refused", () => {
  const event = (over: Record<string, unknown> = {}) => ({
    time: 1758404520000,
    type: "LOGIN_ERROR",
    userId: "subject-member",
    error: "invalid_user_credentials",
    ...over,
  });

  it("asks only for login errors, and only for as many as it was asked for", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await service.loginFailures(50);

    const url = String(fetchMock.mock.calls[1]?.[0]);
    expect(url).toContain("/admin/realms/front-runner/events");
    expect(url).toContain("type=LOGIN_ERROR");
    expect(url).toContain("max=50");
  });

  it("reads the subject, the moment and the reason out of an event", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event()]));
    const service = new KeycloakAdminService(config);

    expect(await service.loginFailures(50)).toEqual([
      {
        subjectId: "subject-member",
        at: new Date(1758404520000),
        reason: "invalid_user_credentials",
      },
    ]);
  });

  /* Keycloak leaves "userId" out when the name somebody typed matched no
   * account. There is nobody it happened to, and a log that grew a row for a
   * name nobody holds would answer "does this account exist" to whoever was
   * guessing. */
  it("drops an attempt that was aimed at no account", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event({ userId: undefined }), event()]));
    const service = new KeycloakAdminService(config);

    expect(await service.loginFailures(50)).toHaveLength(1);
  });

  /* A time that is missing or nonsense would sit at the bottom of the page
   * forever and never clear a high-water mark. */
  it("drops an event with no usable moment", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event({ time: "yesterday" }), event()]));
    const service = new KeycloakAdminService(config);

    expect(await service.loginFailures(50)).toHaveLength(1);
  });

  it("carries no reason when the provider gave none", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event({ error: undefined })]));
    const service = new KeycloakAdminService(config);

    expect((await service.loginFailures(50))[0]?.reason).toBeNull();
  });

  /* 403 is what a realm answers when this client was never given view-events,
   * and it has to read as an outage rather than as a realm with nothing to
   * report: the difference is whether the caller knows to complain. */
  it("treats a refusal as the provider being unavailable", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(403));
    const service = new KeycloakAdminService(config);

    await expect(service.loginFailures(50)).rejects.toThrow();
  });

  it("drops the cached token when it was the token that was refused", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(failed(401))
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await expect(service.loginFailures(50)).rejects.toThrow();
    await service.loginFailures(50);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("reads a body that is not a list as nothing to report", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ error: "unknown" }));
    const service = new KeycloakAdminService(config);

    expect(await service.loginFailures(50)).toEqual([]);
  });
});

describe("reading back the sessions the realm says have finished", () => {
  const event = (over: Record<string, unknown> = {}) => ({
    time: 1758404520000,
    type: "LOGOUT",
    sessionId: "session-one",
    userId: "subject-member",
    ...over,
  });

  /* Two types, because Keycloak has no single event for a session ending, and
   * repeated rather than joined, because a comma-separated list matches no event
   * type at all and would look exactly like a quiet realm. */
  it("asks for both of the ways a session ends", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await service.endedSessions(50);

    const url = String(fetchMock.mock.calls[1]?.[0]);
    expect(url).toContain("type=LOGOUT");
    expect(url).toContain("type=REFRESH_TOKEN_ERROR");
    expect(url).toContain("max=50");
  });

  it("reads the session and the moment out of a logout", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event()]));
    const service = new KeycloakAdminService(config);

    expect(await service.endedSessions(50)).toEqual([
      {
        sessionId: "session-one",
        at: new Date(1758404520000),
        deliberate: true,
      },
    ]);
  });

  /* The distinction that picks the sentence, and the only thing the type is read
   * for. A refused refresh is a session that ended with nobody deciding to end
   * it: idle, past its lifespan, or revoked, and the provider cannot say which. */
  it("marks a refused token refresh as nobody's decision", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event({ type: "REFRESH_TOKEN_ERROR" })]));
    const service = new KeycloakAdminService(config);

    expect((await service.endedSessions(50))[0]?.deliberate).toBe(false);
  });

  /* **The line that makes this safe to read.** Keycloak checks a token's
   * signature before it records anything about it, so a refusal over an invented
   * token names no session, and nobody can push a row onto somebody's security
   * page by posting rubbish at the token endpoint. */
  it("drops an event that names no session", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        ok([
          event({ type: "REFRESH_TOKEN_ERROR", sessionId: undefined }),
          event(),
        ]),
      );
    const service = new KeycloakAdminService(config);

    expect(await service.endedSessions(50)).toHaveLength(1);
  });

  /* No user is read even off a logout, which carries one. Whose session it was
   * is already on record against the login written for it, and reading it from
   * there means one rule for both types and no trust in a supplied subject. */
  it("reads no account out of the event at all", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event()]));
    const service = new KeycloakAdminService(config);

    const [ended] = await service.endedSessions(50);

    expect(ended).not.toHaveProperty("subjectId");
    expect(ended).not.toHaveProperty("userId");
  });

  it("drops an event with no usable moment", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([event({ time: null }), event()]));
    const service = new KeycloakAdminService(config);

    expect(await service.endedSessions(50)).toHaveLength(1);
  });

  it("treats a refusal as the provider being unavailable", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(403));
    const service = new KeycloakAdminService(config);

    await expect(service.endedSessions(50)).rejects.toThrow();
  });

  it("reads a body that is not a list as nothing to report", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ error: "unknown" }));
    const service = new KeycloakAdminService(config);

    expect(await service.endedSessions(50)).toEqual([]);
  });
});

describe("which providers the realm will let an account login from", () => {
  it("reads the realm's identity provider instances", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(
      ok([
        { alias: "google", displayName: "Google", enabled: true },
        { alias: "apple", displayName: "Apple ID", enabled: false },
      ]),
    );
    const service = new KeycloakAdminService(config);

    await expect(service.loginProviders()).resolves.toEqual([
      { alias: "google", name: "Google", enabled: true },
      { alias: "apple", name: "Apple ID", enabled: false },
    ]);

    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/identity-provider/instances",
    );
  });

  // Nothing is filtered out here. A provider switched off is still a row on
  // the page: an account that connected it before it was switched off still
  // has it connected, and a card that hid it would be hiding a credential.
  it("keeps the ones that are switched off", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ alias: "apple", enabled: false }]));
    const service = new KeycloakAdminService(config);

    const providers = await service.loginProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0]?.enabled).toBe(false);
  });

  // Keycloak only asks for a display name when the alias is not the whole
  // answer, so most realms leave it empty. The alias is a better fallback than
  // a blank row, and the browser is what turns "google" into Google.
  it("falls back to the alias where the realm named nothing", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ alias: "google", displayName: "" }]));
    const service = new KeycloakAdminService(config);

    await expect(service.loginProviders()).resolves.toEqual([
      { alias: "google", name: "google", enabled: true },
    ]);
  });

  it("drops an instance with no alias, which is nothing we could address", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ displayName: "Nameless" }]));
    const service = new KeycloakAdminService(config);

    await expect(service.loginProviders()).resolves.toEqual([]);
  });

  // The read needs view-identity-providers, which is a fourth role on the
  // service account. A realm whose mapping predates this feature answers 403,
  // and that is an outage rather than "there are no providers": a card drawn
  // from an empty list would tell somebody their connected Google is gone.
  it("reads a refusal as an outage rather than as an empty realm", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(403));
    const service = new KeycloakAdminService(config);

    await expect(service.loginProviders()).rejects.toThrow(
      "would not say what login providers it has",
    );
  });

  it("drops the cached token when the realm refuses it", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(failed(401))
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]));
    const service = new KeycloakAdminService(config);

    await expect(service.loginProviders()).rejects.toThrow();
    await service.loginProviders();

    /* Four calls rather than three: the second attempt asked for a token
     * again instead of presenting the one that was just refused. */
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("which of them an account has connected", () => {
  it("reads the account's federated identities", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(
      ok([
        {
          identityProvider: "google",
          userId: "116100000000000000000",
          userName: "marcus@gmail.test",
        },
      ]),
    );
    const service = new KeycloakAdminService(config);

    await expect(service.linkedLogins("subject-marcus")).resolves.toEqual([
      { alias: "google", userName: "marcus@gmail.test" },
    ]);

    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/federated-identity",
    );
  });

  // The id the account holds at Google is on the same row and is deliberately
  // not read: nothing shows it, and it is the one part of this that is
  // somebody else's identifier.
  it("keeps the name and leaves the provider's own id where it is", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(
      ok([
        {
          identityProvider: "google",
          userId: "116100000000000000000",
          userName: "marcus@gmail.test",
        },
      ]),
    );
    const service = new KeycloakAdminService(config);

    const [link] = await service.linkedLogins("subject-marcus");

    expect(Object.keys(link ?? {}).toSorted()).toEqual(["alias", "userName"]);
  });

  it("reads a name the provider left empty as no name at all", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ identityProvider: "apple", userName: "" }]));
    const service = new KeycloakAdminService(config);

    await expect(service.linkedLogins("subject-marcus")).resolves.toEqual([
      { alias: "apple", userName: null },
    ]);
  });

  it("reads a refusal as an outage", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.linkedLogins("subject-marcus")).rejects.toThrow(
      "would not say which logins this account has connected",
    );
  });
});

describe("disconnecting one of them", () => {
  it("deletes the federated identity by alias", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.unlinkLogin("subject-marcus", "google");

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/federated-identity/google",
    );
    expect(init?.method).toBe("DELETE");
  });

  // The page it was pressed on is a moment old, and the end state is the one
  // that was asked for either way: nothing connected.
  it("reads a provider that was not connected as done rather than as a failure", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(404));
    const service = new KeycloakAdminService(config);

    await expect(
      service.unlinkLogin("subject-marcus", "google"),
    ).resolves.toBeUndefined();
  });

  it("reads anything else as an outage", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.unlinkLogin("subject-marcus", "google"),
    ).rejects.toThrow("would not disconnect that login");
  });

  // The alias reaches a URL path, so it is quoted on the way in. The schema in
  // front of this refuses the shapes that would matter; this is the belt.
  it("quotes the alias it is given", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.unlinkLogin("subject-marcus", "a b");

    expect(String(fetchMock.mock.calls[1]![0])).toContain(
      "/federated-identity/a%20b",
    );
  });
});

describe("whether the account still has a password", () => {
  it("is true when the credential list holds one", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ type: "password", createdDate: 1 }]));
    const service = new KeycloakAdminService(config);

    await expect(service.hasPassword("subject-marcus")).resolves.toBe(true);
  });

  // An account that arrived through Google may never have had one.
  it("is false when it holds none", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([{ type: "otp" }]));
    const service = new KeycloakAdminService(config);

    await expect(service.hasPassword("subject-marcus")).resolves.toBe(false);
  });

  // The safe direction, and the reason this one does not throw: the card then
  // offers no Disconnect at all, and nobody is disconnected from the last way
  // into their own account on the strength of an outage.
  it("is false when the provider will not say", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.hasPassword("subject-marcus")).resolves.toBe(false);
  });
});

/*
 * The second factors an account holds, read out of the same credentials list
 * the two blocks above walk, and taken away one at a time.
 *
 * Two assertions carry this. Only a time-based one-time password becomes a
 * factor -- Keycloak files both flavors under type "otp" and says which in a
 * JSON string, and a counter-based credential is a different thing to set up
 * and to lose. And an outage throws rather than answering an empty list,
 * which is the opposite of what hasPassword above does and is the same
 * reasoning: the safe direction here is refusing to draw, because an empty
 * answer is drawn as an account with nothing protecting it.
 */
describe("the second factors an account holds", () => {
  const totp = (over: Record<string, unknown> = {}) => ({
    id: "credential-otp",
    type: "otp",
    userLabel: "iPhone",
    createdDate: 1790400064804,
    credentialData: '{"subType":"totp","digits":6,"period":30}',
    ...over,
  });

  /* Two reads, not one, and the reason is the shape of the two factors rather
   * than an inefficiency: an authenticator app is a credential and a phone
   * number is an attribute on the account, so they are in two different places
   * at Keycloak and neither read can answer for the other. */
  const answering = (credentials: unknown[], attributes: unknown = {}) =>
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok(credentials))
      .mockResolvedValueOnce(ok({ id: "subject-marcus", attributes }));

  it("reads an authenticator app off the credential list", async () => {
    answering([{ type: "password" }, totp()]);
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([
      {
        kind: "authenticator-app",
        id: "credential-otp",
        label: "iPhone",
        createdAt: new Date(1790400064804),
      },
    ]);
  });

  it("asks for the account's credentials and then the account itself", async () => {
    answering([]);
    const service = new KeycloakAdminService(config);

    await service.secondFactors("subject-marcus");

    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/credentials",
    );
    expect(String(fetchMock.mock.calls[2]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus",
    );
  });

  // A counter-based credential is not an authenticator app as this product
  // means one, and a row claiming it was would be wrong in both directions.
  it("leaves a counter-based one-time password out", async () => {
    answering([totp({ credentialData: '{"subType":"hotp","counter":0}' })]);
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([]);
  });

  it("leaves out an otp credential whose data will not parse", async () => {
    answering([totp({ credentialData: "not json" })]);
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([]);
  });

  it("carries no label and no date where Keycloak gives none", async () => {
    answering([totp({ userLabel: "", createdDate: "whenever" })]);
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([
      {
        kind: "authenticator-app",
        id: "credential-otp",
        label: null,
        createdAt: null,
      },
    ]);
  });

  /* The assertion this block exists for. An empty list is drawn as "no second
   * factor yet", beside an offer to turn one on; a provider that would not
   * answer must not be drawn that way. */
  it("throws rather than answering an empty list when the provider will not say", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).rejects.toThrow(
      "would not say what this account uses",
    );
  });

  it("throws on the same terms when it cannot read the account itself", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).rejects.toThrow(
      "would not say what this account uses",
    );
  });
});

describe("the phone number an account is texted at", () => {
  const answering = (attributes: unknown) =>
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok({ id: "subject-marcus", attributes }));

  it("reads a number off the account as a second factor", async () => {
    answering({
      phoneNumber: ["+15555550123"],
      phoneNumberVerifiedAt: ["2026-09-10T10:00:00.000Z"],
    });
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([
      {
        kind: "sms",
        id: "phone",
        label: "\u2022\u2022\u2022\u2022 0123",
        createdAt: new Date("2026-09-10T10:00:00.000Z"),
      },
    ]);
  });

  /* The number never leaves here whole. A security page that printed it would
   * be handing it to whoever is reading over a shoulder, or to whoever already
   * has the session and is looking for the next thing to take over. */
  it("cuts the number down to its last four digits", async () => {
    answering({ phoneNumber: ["+442079460958"] });
    const service = new KeycloakAdminService(config);

    const [factor] = await service.secondFactors("subject-marcus");

    expect(factor?.label).toBe("\u2022\u2022\u2022\u2022 0958");
    expect(factor?.label).not.toContain("2079");
  });

  it("carries no date where the account has none", async () => {
    answering({ phoneNumber: ["+15555550123"] });
    const service = new KeycloakAdminService(config);

    const [factor] = await service.secondFactors("subject-marcus");

    expect(factor?.createdAt).toBeNull();
  });

  it("carries no date where the one on the account will not parse", async () => {
    answering({
      phoneNumber: ["+15555550123"],
      phoneNumberVerifiedAt: ["whenever"],
    });
    const service = new KeycloakAdminService(config);

    const [factor] = await service.secondFactors("subject-marcus");

    expect(factor?.createdAt).toBeNull();
  });

  it.each([
    ["no attributes at all", {}],
    ["an empty list", { phoneNumber: [] }],
    ["a blank number", { phoneNumber: ["   "] }],
    ["something that is not a list", { phoneNumber: 15555550123 }],
  ])("answers no SMS factor for %s", async (_name, attributes) => {
    answering(attributes);
    const service = new KeycloakAdminService(config);

    await expect(service.secondFactors("subject-marcus")).resolves.toEqual([]);
  });
});

describe("writing a phone number onto the account", () => {
  const body = () =>
    JSON.parse(String(fetchMock.mock.calls[2]![1]?.body)) as {
      attributes: Record<string, unknown>;
    };

  it("writes the number and when it was proved", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ id: "subject-marcus", attributes: {} }))
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setSecondFactorPhone("subject-marcus", "+15555550123");

    const [url, init] = fetchMock.mock.calls[2]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus",
    );
    expect(init?.method).toBe("PUT");
    expect(body().attributes.phoneNumber).toEqual(["+15555550123"]);
    expect(
      String((body().attributes.phoneNumberVerifiedAt as string[])[0]),
    ).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  /* Read, change, write. Keycloak's user update replaces the whole attribute
   * map, so a PUT carrying only these two keys would quietly delete every
   * other attribute the realm has ever put on the account. */
  it("keeps every other attribute the account already had", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        ok({
          id: "subject-marcus",
          attributes: { locale: ["es-MX"], phoneNumber: ["+15555550000"] },
        }),
      )
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.setSecondFactorPhone("subject-marcus", "+15555550123");

    expect(body().attributes.locale).toEqual(["es-MX"]);
    expect(body().attributes.phoneNumber).toEqual(["+15555550123"]);
  });

  it("reads a refusal as an outage", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok({ id: "subject-marcus", attributes: {} }))
      .mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.setSecondFactorPhone("subject-marcus", "+15555550123"),
    ).rejects.toThrow("would not change two-factor authentication");
  });
});

describe("taking a second factor away", () => {
  it("deletes the credential by the id the read gave it", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.removeSecondFactor("subject-marcus", "credential-otp");

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/credentials/credential-otp",
    );
    expect(init?.method).toBe("DELETE");
  });

  // The page it was pressed on is a moment old, and the end state is the one
  // that was asked for either way: no such factor.
  it("reads a credential that was not there as done rather than as a failure", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(404));
    const service = new KeycloakAdminService(config);

    await expect(
      service.removeSecondFactor("subject-marcus", "credential-otp"),
    ).resolves.toBeUndefined();
  });

  it("reads anything else as an outage", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.removeSecondFactor("subject-marcus", "credential-otp"),
    ).rejects.toThrow("would not turn off two-factor authentication");
  });

  it("quotes the credential id it is given", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.removeSecondFactor("subject-marcus", "a b");

    expect(String(fetchMock.mock.calls[1]![0])).toContain("/credentials/a%20b");
  });

  /* The phone factor is an attribute rather than a credential, so taking it
   * off is a write to the account. The id is what says which of the two this
   * is: the caller took it out of secondFactors, and only this file knows what
   * its own ids mean. */
  it("clears the number instead of deleting a credential", async () => {
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(
        ok({
          id: "subject-marcus",
          attributes: {
            locale: ["es-MX"],
            phoneNumber: ["+15555550123"],
            phoneNumberVerifiedAt: ["2026-09-10T10:00:00.000Z"],
          },
        }),
      )
      .mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.removeSecondFactor("subject-marcus", "phone");

    const [url, init] = fetchMock.mock.calls[2]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus",
    );
    expect(init?.method).toBe("PUT");
    const { attributes } = JSON.parse(String(init?.body)) as {
      attributes: Record<string, unknown>;
    };
    expect(attributes).toEqual({ locale: ["es-MX"] });
  });
});

/*
 * The passkeys an account holds, read out of the same credentials list and
 * taken away one at a time.
 *
 * Two assertions carry this block. Only the passwordless flavor becomes a
 * row: Keycloak files a passkey under type "webauthn-passwordless" and files
 * the second-factor version of the same ceremony under "webauthn", and this
 * product's login flow has no step that would ever ask for the second. And an
 * outage throws rather than answering an empty list, on the terms
 * secondFactors throws: an empty answer is drawn as an account that has never
 * registered one, beside an offer to add one.
 */
describe("the passkeys an account holds", () => {
  const passkey = (over: Record<string, unknown> = {}) => ({
    id: "credential-passkey",
    type: "webauthn-passwordless",
    userLabel: "MacBook Touch ID",
    createdDate: 1790400064804,
    ...over,
  });

  /* One read, unlike secondFactors above: a passkey is a credential and only
   * a credential, so there is no attribute on the account to go back for. */
  const answering = (credentials: unknown[]) =>
    fetchMock
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(ok(credentials));

  it("reads a registered passkey off the credential list", async () => {
    answering([{ type: "password" }, passkey()]);
    const service = new KeycloakAdminService(config);

    await expect(service.passkeys("subject-marcus")).resolves.toEqual([
      {
        id: "credential-passkey",
        label: "MacBook Touch ID",
        createdAt: new Date(1790400064804),
      },
    ]);
  });

  it("asks for the account's credentials and nothing else", async () => {
    answering([]);
    const service = new KeycloakAdminService(config);

    await service.passkeys("subject-marcus");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]![0])).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/credentials",
    );
  });

  /* The assertion this block exists for. A "webauthn" credential is the same
   * ceremony registered as a second factor, and a row drawn for one would
   * promise a passwordless login this realm's flow will never offer. */
  it("leaves out the second-factor flavor of the same ceremony", async () => {
    answering([passkey({ type: "webauthn" })]);
    const service = new KeycloakAdminService(config);

    await expect(service.passkeys("subject-marcus")).resolves.toEqual([]);
  });

  it("leaves out a credential with no id to remove it by", async () => {
    answering([passkey({ id: "" })]);
    const service = new KeycloakAdminService(config);

    await expect(service.passkeys("subject-marcus")).resolves.toEqual([]);
  });

  it("carries no label and no date where Keycloak gives none", async () => {
    answering([passkey({ userLabel: "   ", createdDate: "whenever" })]);
    const service = new KeycloakAdminService(config);

    await expect(service.passkeys("subject-marcus")).resolves.toEqual([
      { id: "credential-passkey", label: null, createdAt: null },
    ]);
  });

  it("throws rather than answering an empty list when the provider will not say", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(service.passkeys("subject-marcus")).rejects.toThrow(
      "would not say what passkeys this account has",
    );
  });
});

describe("taking a passkey away", () => {
  it("deletes the credential by the id the read gave it", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.removePasskey("subject-marcus", "credential-passkey");

    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "http://keycloak-idp:8080/admin/realms/front-runner/users/subject-marcus/credentials/credential-passkey",
    );
    expect(init?.method).toBe("DELETE");
  });

  // The page it was pressed on is a moment old, and the end state is the one
  // that was asked for either way: no such passkey.
  it("reads a credential that was not there as done rather than as a failure", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(404));
    const service = new KeycloakAdminService(config);

    await expect(
      service.removePasskey("subject-marcus", "credential-passkey"),
    ).resolves.toBeUndefined();
  });

  it("reads anything else as an outage", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(failed(500));
    const service = new KeycloakAdminService(config);

    await expect(
      service.removePasskey("subject-marcus", "credential-passkey"),
    ).rejects.toThrow("would not remove that passkey");
  });

  it("quotes the credential id it is given", async () => {
    fetchMock.mockResolvedValueOnce(token()).mockResolvedValueOnce(ok());
    const service = new KeycloakAdminService(config);

    await service.removePasskey("subject-marcus", "a b");

    expect(String(fetchMock.mock.calls[1]![0])).toContain("/credentials/a%20b");
  });
});
