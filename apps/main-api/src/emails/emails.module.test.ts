import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { MailModule } from "../mail/index.js";
import { EmailsModule } from "./emails.module.js";
import { EmailsResolver } from "./emails.resolver.js";
import { EmailsService } from "./emails.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, EmailsModule) ?? [];

describe("how the emails vertical is wired", () => {
  // Three imports, and each is a thing changing an address actually needs:
  // the database holds the list, the mailer sends the link, and
  // authentication is where the Keycloak admin client lives, because making
  // an address primary changes a login.
  it("brings the database, the mailer and the identity provider with it", () => {
    expect(wiring("imports")).toEqual([
      DatabaseModule,
      MailModule,
      AuthenticationModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([EmailsResolver, EmailsService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
