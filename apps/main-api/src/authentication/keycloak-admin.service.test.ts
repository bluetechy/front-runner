import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { KeycloakAdminService } from "./keycloak-admin.service.js";

/*
 * Writing to Keycloak: half of what "make this address my login" means -- the
 * other half is dbo.SetPrimaryUserEmail -- and the whole of what making an
 * account on the site's own sign-up form means.
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

  // The transport passes BAD_REQUEST and FORBIDDEN through and collapses
  // everything else into "Internal server error". A sentence somebody has to
  // act on has to arrive as one of the two, so this is asserted rather than
  // left to the name of the exception.
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
