import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { SmsModule } from "../sms/index.js";
import { TwoFactorModule } from "./two-factor.module.js";
import { TwoFactorResolver } from "./two-factor.resolver.js";
import { TwoFactorService } from "./two-factor.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, TwoFactorModule) ?? [];

describe("how the two-factor vertical is wired", () => {
  // Four imports, which is two more than its neighbors have and is the shape
  // of the feature: the identity provider holds the factors, this database
  // holds the recovery codes and the half-finished phone numbers it cannot
  // hold, the security log is where every change to either is written down,
  // and the SMS transport carries the one message this vertical sends itself.
  it("brings the identity provider, the database, the security log and the SMS transport", () => {
    expect(wiring("imports")).toEqual([
      AuthenticationModule,
      DatabaseModule,
      SecurityEventsModule,
      SmsModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([TwoFactorResolver, TwoFactorService]);
  });

  it("exports nothing, so it is reached through the schema and nowhere else", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
