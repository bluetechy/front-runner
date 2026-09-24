import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { RegistrationModule } from "./registration.module.js";
import { RegistrationResolver } from "./registration.resolver.js";
import { RegistrationService } from "./registration.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, RegistrationModule) ?? [];

describe("how the registration vertical is wired", () => {
  // One import, and no database: an account is made at the identity provider, and this
  // application's row for it is written by dbo.ProvisionUser on the first
  // request the new session makes.
  it("brings the identity provider with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([AuthenticationModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([
      RegistrationResolver,
      RegistrationService,
    ]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
