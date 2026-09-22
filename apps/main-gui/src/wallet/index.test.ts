import { describe, expect, it } from "vitest";
import * as wallet from "./index";
import { Wallet } from "./wallet";
import { useWallet } from "./wallet-api";

/*
 * The page, and the hook behind it. `PaymentMethod` and `PaymentMethodKind`
 * are types and leave nothing behind at runtime, which is why they are not in
 * this list even though they are exported.
 *
 * The two dialogs, the list and the schema stay inside: they are how this
 * page is built, and a caller reaching for one would be adding a payment
 * method from somewhere this vertical does not know about.
 */

describe("what the wallet offers the rest of the app", () => {
  it("offers the page and the hook, and nothing else", () => {
    expect(Object.keys(wallet).toSorted()).toEqual(["Wallet", "useWallet"]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(wallet.Wallet).toBe(Wallet);
    expect(wallet.useWallet).toBe(useWallet);
  });

  it.each([
    "AddCardDialog",
    "AddBankDialog",
    "MethodList",
    "MethodDialog",
    "creditCardSchema",
    "bankAccountSchema",
  ])("keeps %s to itself", (inside) => {
    expect(Object.keys(wallet)).not.toContain(inside);
  });
});
