import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { MailModule } from "../mail/index.js";
import { PasswordResetModule } from "./password-reset.module.js";
import { PasswordResetResolver } from "./password-reset.resolver.js";
import { PasswordResetService } from "./password-reset.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, PasswordResetModule) ?? [];

describe("how the password reset vertical is wired", () => {
  // Three imports, one for each party in a reset: the database holds the
  // token, the mail carries it, and the identity provider holds the password at the end.
  it("brings the database, the mail and the identity provider with it", () => {
    expect(wiring("imports")).toEqual([
      DatabaseModule,
      MailModule,
      AuthenticationModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([
      PasswordResetResolver,
      PasswordResetService,
    ]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
