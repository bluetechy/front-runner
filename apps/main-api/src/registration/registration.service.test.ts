import { describe, expect, it, jest } from "@jest/globals";
import type { KeycloakAdminService } from "../authentication/index.js";
import { RegistrationService } from "./registration.service.js";

/*
 * Making an account.
 *
 * Two assertions carry this file. The account is created in Keycloak and
 * nowhere else -- this application's own row is dbo.ProvisionUser's doing, on
 * the first request the new session makes, the same as for somebody who
 * registered on Keycloak's hosted page or arrived through Google. And a
 * refusal from Keycloak is passed on rather than swallowed: somebody told
 * their account was made when it was not would try to sign in with it.
 */

const form = {
  Username: "marcus",
  Email: "marcus@example.test",
  FirstName: "Marcus",
  LastName: "Wright",
  Password: "a-good-enough-password",
};

function setup() {
  const keycloak = {
    createUser: jest.fn<(account: unknown) => Promise<void>>(),
  };
  keycloak.createUser.mockResolvedValue(undefined);
  return {
    keycloak,
    service: new RegistrationService(
      keycloak as unknown as KeycloakAdminService,
    ),
  };
}

describe("registering", () => {
  it("creates the account in Keycloak, with the password it was given", async () => {
    const { service, keycloak } = setup();

    await service.register(form);

    expect(keycloak.createUser).toHaveBeenCalledWith({
      username: "marcus",
      email: "marcus@example.test",
      firstName: "Marcus",
      lastName: "Wright",
      password: "a-good-enough-password",
    });
  });

  it("answers with the username and the address, and no password", async () => {
    const { service } = setup();

    await expect(service.register(form)).resolves.toEqual({
      Username: "marcus",
      Email: "marcus@example.test",
    });
  });

  // Somebody told their account was made when it was not would go on to try
  // to sign in with it, and be told their password was wrong.
  it("passes a refusal on rather than reporting an account that does not exist", async () => {
    const { service, keycloak } = setup();
    keycloak.createUser.mockRejectedValue(
      new Error("That username or email address is already taken") as never,
    );

    await expect(service.register(form)).rejects.toThrow("already taken");
  });
});
