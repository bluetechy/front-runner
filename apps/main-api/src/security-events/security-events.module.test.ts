import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { PasswordResetModule } from "../password-reset/index.js";
import { LoginFailuresService } from "./login-failures.service.js";
import { SecurityEventsModule } from "./security-events.module.js";
import { SecurityEventsResolver } from "./security-events.resolver.js";
import { SecurityEventsService } from "./security-events.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, SecurityEventsModule) ?? [];

describe("how the security events vertical is wired", () => {
  /* Forgetting a password comes with it, because "No, secure account" is that
   * flow: the same token, the same message, the same page at the end of it.
   * The identity provider comes with it because a refused login is the one
   * thing on this page that never reaches the request path. */
  it("brings the database, the password reset flow and the provider with it", () => {
    expect(wiring("imports")).toEqual([
      DatabaseModule,
      PasswordResetModule,
      AuthenticationModule,
    ]);
  });

  it("provides the resolver, the service, and the mirror behind them", () => {
    expect(wiring("providers")).toEqual([
      SecurityEventsResolver,
      SecurityEventsService,
      LoginFailuresService,
    ]);
  });

  /* Nothing injects it and nothing should: it is a timer, not an operation.
   * Exporting it would invite a vertical to reach for a sweep. */
  it("keeps the mirror to itself", () => {
    expect(wiring("exports")).not.toContain(LoginFailuresService);
  });

  /* The exception to "a vertical is reached through the schema": a log is
   * written by whatever it is a log of. */
  it("exports the service, so other verticals can record into the log", () => {
    expect(wiring("exports")).toEqual([SecurityEventsService]);
  });
});
