import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as wallet from "./index.js";
import { WalletModule } from "./wallet.module.js";

describe("what the wallet vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(wallet).toSorted()).toEqual(["WalletModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(wallet.WalletModule).toBe(WalletModule);
  });
});
