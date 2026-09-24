import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { IdentityAdminService } from "./identity-admin.service.js";
import { KeycloakAdminService } from "./keycloak-admin.service.js";
import { AuthenticationModule } from "./authentication.module.js";
import {
  TokenVerifierService,
  identityKeySetProvider,
} from "./token-verifier.service.js";

/*
 * The guard is registered as APP_GUARD rather than put on each resolver,
 * which is what makes "signed in" the default for the whole schema and
 * `@Public()` the exception. A guard listed anywhere else would be a schema
 * where forgetting to decorate an operation leaves it open.
 */

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, AuthenticationModule) ?? [];

describe("how authentication is wired", () => {
  it("brings the database with it: a token is only half of an identity", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("guards every operation in the application at once", () => {
    expect(wiring("providers")).toContainEqual({
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    });
  });

  it("resolves the signing keys through a provider the tests can replace", () => {
    expect(wiring("providers")).toContain(identityKeySetProvider);
  });

  // The two pieces another vertical may inject: the one that verifies a token
  // and the one that writes to whoever holds the accounts. The guard is not
  // exported -- nothing should be running it a second time by hand.
  it("exports the two identity services and nothing else", () => {
    expect(wiring("exports")).toEqual([
      TokenVerifierService,
      IdentityAdminService,
    ]);
  });

  // The one line in the API that picks an identity provider. A vertical asks
  // for IdentityAdminService and gets whatever is bound here, so a move to
  // another provider is a new implementation and this line, and no vertical is
  // edited at all.
  it("binds the port to the Keycloak implementation, and there alone", () => {
    expect(wiring("providers")).toContainEqual({
      provide: IdentityAdminService,
      useClass: KeycloakAdminService,
    });
    expect(wiring("exports")).not.toContain(KeycloakAdminService);
  });
});
