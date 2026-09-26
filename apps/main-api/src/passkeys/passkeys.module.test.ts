import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { PasskeysModule } from "./passkeys.module.js";
import { PasskeysResolver } from "./passkeys.resolver.js";
import { PasskeysService } from "./passkeys.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, PasskeysModule) ?? [];

describe("how the passkeys vertical is wired", () => {
  // Two imports, which is the fewest of the five security-page verticals and
  // is the shape of the feature: the identity provider holds the credentials
  // and the security log records the two things that happen to them. No
  // database, because there is nothing of a passkey for this product to
  // keep; no mail, because nothing about one is announced.
  it("brings the identity provider and the security log, and nothing else", () => {
    expect(wiring("imports")).toEqual([
      AuthenticationModule,
      SecurityEventsModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([PasskeysResolver, PasskeysService]);
  });

  it("exports nothing, so it is reached through the schema and nowhere else", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
