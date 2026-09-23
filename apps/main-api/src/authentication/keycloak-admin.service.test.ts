import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { KeycloakAdminService } from "./keycloak-admin.service.js";

/*
 * Writing to Keycloak, which is half of what "make this address my login"
 * means: the other half is dbo.SetPrimaryUserEmail.
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

const failed = (status: number) =>
  ({ ok: false, status, json: async () => ({}) }) as Response;

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
