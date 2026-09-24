import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as authentication from "./index.js";
import { AuthenticationModule } from "./authentication.module.js";
import {
  CurrentUser,
  Public,
  PUBLIC_OPERATION,
} from "./authentication.decorators.js";
import { IdentityAdminService } from "./identity-admin.service.js";
import {
  IDENTITY_KEY_SET,
  TokenVerifierService,
  identityKeySetProvider,
} from "./token-verifier.service.js";

/*
 * This vertical is the one every other one imports from, so its surface is
 * worth stating in one place: two decorators for writing resolvers and the
 * metadata key behind one of them, the module, the two identity services, and
 * the pieces the tests need to stand a provider up without a network.
 *
 * IdentityAdminService is the abstract one: what a vertical may ask of
 * whoever holds the accounts. KeycloakAdminService, which answers it today, is
 * deliberately absent -- a vertical that could inject it could depend on a
 * realm.
 * `Principal`, `GraphqlContext`, `VerifiedIdentity`, `NewAccount` and
 * `Account` are types and leave nothing behind at runtime, which is why they
 * are not in this list.
 */

describe("what authentication offers the rest of the API", () => {
  it("offers its module, its two services, its key set, and the decorators", () => {
    expect(Object.keys(authentication).toSorted()).toEqual([
      "AuthenticationModule",
      "CurrentUser",
      "IDENTITY_KEY_SET",
      "IdentityAdminService",
      "PUBLIC_OPERATION",
      "Public",
      "TokenVerifierService",
      "identityKeySetProvider",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(authentication.AuthenticationModule).toBe(AuthenticationModule);
    expect(authentication.TokenVerifierService).toBe(TokenVerifierService);
    expect(authentication.IDENTITY_KEY_SET).toBe(IDENTITY_KEY_SET);
    expect(authentication.identityKeySetProvider).toBe(identityKeySetProvider);
    expect(authentication.IdentityAdminService).toBe(IdentityAdminService);
    expect(authentication.CurrentUser).toBe(CurrentUser);
    expect(authentication.Public).toBe(Public);
    expect(authentication.PUBLIC_OPERATION).toBe(PUBLIC_OPERATION);
  });

  // Neither the guard nor the Keycloak implementation is here, for two
  // different reasons: the guard is registered once as APP_GUARD and nothing
  // else should run it a second time by hand, and naming the implementation
  // would let a vertical depend on the provider this installation happens to
  // run. See authentication.module.ts.
  it("offers neither the guard nor the provider it runs on", () => {
    expect(Object.keys(authentication)).not.toContain("KeycloakAdminService");
  });

  it("does not offer the guard", () => {
    expect(Object.keys(authentication)).not.toContain("AuthenticationGuard");
  });
});
