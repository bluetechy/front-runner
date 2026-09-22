import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { AuthenticationModule } from "./authentication.module.js";
import { KeycloakService, keycloakKeySetProvider } from "./keycloak.service.js";

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

  it("resolves the realm's keys through a provider the tests can replace", () => {
    expect(wiring("providers")).toContain(keycloakKeySetProvider);
  });

  // The only piece another vertical may inject. The guard is not exported:
  // nothing should be running it a second time by hand.
  it("exports the Keycloak service and nothing else", () => {
    expect(wiring("exports")).toEqual([KeycloakService]);
  });
});
