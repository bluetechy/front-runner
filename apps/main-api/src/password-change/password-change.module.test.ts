import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { PasswordResetModule } from "../password-reset/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { PasswordChangeModule } from "./password-change.module.js";
import { PasswordChangeResolver } from "./password-change.resolver.js";
import { PasswordChangeService } from "./password-change.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, PasswordChangeModule) ?? [];

describe("how the password change vertical is wired", () => {
  // One import per thing a change needs: the identity provider holds the
  // password, the reset vertical states the rule a new one keeps, and the
  // security log is where the change is written down.
  it("brings the identity provider, the password rule and the security log", () => {
    expect(wiring("imports")).toEqual([
      AuthenticationModule,
      PasswordResetModule,
      SecurityEventsModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([
      PasswordChangeResolver,
      PasswordChangeService,
    ]);
  });

  /* The direction the arrows run, which is the reason this is a vertical of
   * its own rather than two more operations on the reset one. The security
   * vertical already imports the reset vertical, so a change living in the
   * reset vertical would have had to import the security vertical back. */
  it("exports nothing, so it is reached through the schema and nowhere else", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
