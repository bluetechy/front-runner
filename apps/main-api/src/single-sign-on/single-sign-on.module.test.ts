import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { AuthenticationModule } from "../authentication/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { SingleSignOnModule } from "./single-sign-on.module.js";
import { SingleSignOnResolver } from "./single-sign-on.resolver.js";
import { SingleSignOnService } from "./single-sign-on.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, SingleSignOnModule) ?? [];

describe("how the single sign-on vertical is wired", () => {
  // Two imports and no more: the identity provider holds the connections, and
  // the security log is where the two that change one are written down.
  it("brings the identity provider and the security log", () => {
    expect(wiring("imports")).toEqual([
      AuthenticationModule,
      SecurityEventsModule,
    ]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([
      SingleSignOnResolver,
      SingleSignOnService,
    ]);
  });

  it("exports nothing, so it is reached through the schema and nowhere else", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
