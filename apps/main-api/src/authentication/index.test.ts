import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as authentication from "./index.js";
import { AuthenticationModule } from "./authentication.module.js";
import {
  CurrentUser,
  Public,
  PUBLIC_OPERATION,
} from "./authentication.decorators.js";
import { KeycloakAdminService } from "./keycloak-admin.service.js";
import {
  KEYCLOAK_KEY_SET,
  KeycloakService,
  keycloakKeySetProvider,
} from "./keycloak.service.js";

/*
 * This vertical is the one every other one imports from, so its surface is
 * worth stating in one place: two decorators for writing resolvers and the
 * metadata key behind one of them, the module, the two Keycloak services, and
 * the pieces the tests need to stand a realm up without a network.
 * `Principal`, `GraphqlContext` and `VerifiedIdentity` are types and leave
 * nothing behind at runtime, which is why they are not in this list.
 */

describe("what authentication offers the rest of the API", () => {
  it("offers its module, its two services, its key set, and the decorators", () => {
    expect(Object.keys(authentication).toSorted()).toEqual([
      "AuthenticationModule",
      "CurrentUser",
      "KEYCLOAK_KEY_SET",
      "KeycloakAdminService",
      "KeycloakService",
      "PUBLIC_OPERATION",
      "Public",
      "keycloakKeySetProvider",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(authentication.AuthenticationModule).toBe(AuthenticationModule);
    expect(authentication.KeycloakService).toBe(KeycloakService);
    expect(authentication.KEYCLOAK_KEY_SET).toBe(KEYCLOAK_KEY_SET);
    expect(authentication.keycloakKeySetProvider).toBe(keycloakKeySetProvider);
    expect(authentication.KeycloakAdminService).toBe(KeycloakAdminService);
    expect(authentication.CurrentUser).toBe(CurrentUser);
    expect(authentication.Public).toBe(Public);
    expect(authentication.PUBLIC_OPERATION).toBe(PUBLIC_OPERATION);
  });

  // The guard is not here on purpose: it is registered once as APP_GUARD, and
  // nothing else should be able to run it a second time by hand.
  it("does not offer the guard", () => {
    expect(Object.keys(authentication)).not.toContain("AuthenticationGuard");
  });
});
