import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { WalletModule } from "./wallet.module.js";
import { WalletResolver } from "./wallet.resolver.js";
import { WalletService } from "./wallet.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, WalletModule) ?? [];

describe("how the wallet vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([WalletResolver, WalletService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
