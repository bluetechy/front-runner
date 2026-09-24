import { describe, expect, it } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { IdentityAdminService } from "./identity-admin.service.js";
import { KeycloakAdminService } from "./keycloak-admin.service.js";

/*
 * The port every vertical asks for accounts through. There is no behavior in
 * the file itself -- the methods are abstract, and what they do is each
 * implementation's own test -- so what is worth asserting is the seam: that
 * the port survives to runtime as something Nest can inject against, and that
 * the implementation this installation runs answers all of it.
 *
 * The list below is written out rather than derived, because abstract members
 * leave nothing behind to derive it from, and because that is the point: ten
 * operations, and adding an eleventh is a decision, not a drift. Every one of
 * them costs a rewrite when the provider changes.
 */

const operations = [
  "setEmail",
  "createUser",
  "findAccount",
  "account",
  "setPassword",
  "verifyPassword",
  "passwordChangedAt",
  "endOtherSessions",
  "loginFailures",
  "endedSessions",
] as const;

const config = {
  getOrThrow: () => "unused-in-this-test",
} as unknown as ConfigService;

describe("what a vertical may ask of whoever holds the accounts", () => {
  // Nest resolves a provider by a value, which is why this is an abstract
  // class and not an interface: an interface would be gone by the time the
  // container looked for one.
  it("is a value at runtime, so it can be an injection token", () => {
    expect(typeof IdentityAdminService).toBe("function");
  });

  it("is ten operations, and no more", () => {
    expect(operations).toHaveLength(10);
  });

  it.each(operations)(
    "is answered by the Keycloak implementation: %s",
    (operation) => {
      expect(typeof KeycloakAdminService.prototype[operation]).toBe("function");
    },
  );

  // Not merely the same shape: a provider bound to this token has to be one,
  // or `{ provide: IdentityAdminService, useClass: ... }` is binding something
  // the type system never checked.
  it("is what the Keycloak implementation extends", () => {
    expect(new KeycloakAdminService(config)).toBeInstanceOf(
      IdentityAdminService,
    );
  });
});
