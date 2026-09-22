import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PaymentMethodKind } from "./wallet.model.js";
import type { BankAccountFields, CreditCardFields } from "./wallet.schema.js";
import { WalletResolver } from "./wallet.resolver.js";
import { WalletService } from "./wallet.service.js";

/*
 * Your own wallet and nobody else's: none of the five takes a user, so there
 * is no way to name somebody else's wallet.
 *
 * All four mutations answer with the whole wallet rather than the row they
 * touched, because all four can move the default -- adding the first method
 * makes it the default, and removing the default promotes another.
 */

const user = { userId: "user-id", loginName: "alice" };

const card = { NameOnCard: "Matthew Mattson" } as unknown as CreditCardFields;
const account = {
  NameOnAccount: "Matthew Mattson",
} as unknown as BankAccountFields;

function setup() {
  const wallet = ["the whole wallet"];
  const service = {
    list: jest.fn().mockReturnValue(wallet),
    addCreditCard: jest.fn().mockReturnValue(wallet),
    addBankAccount: jest.fn().mockReturnValue(wallet),
    setDefault: jest.fn().mockReturnValue(wallet),
    remove: jest.fn().mockReturnValue(wallet),
  };
  return {
    wallet,
    service,
    resolver: new WalletResolver(service as unknown as WalletService),
  };
}

describe("reading the wallet", () => {
  it("lists the methods of the account the token names", () => {
    const { resolver, service, wallet } = setup();

    expect(resolver.paymentMethods(user)).toBe(wallet);
    expect(service.list).toHaveBeenCalledWith("alice");
  });
});

describe("changing the wallet", () => {
  it("adds a card and a bank account as the caller", () => {
    const { resolver, service } = setup();

    resolver.addCreditCard(user, card);
    resolver.addBankAccount(user, account);

    expect(service.addCreditCard).toHaveBeenCalledWith("alice", card);
    expect(service.addBankAccount).toHaveBeenCalledWith("alice", account);
  });

  it("names the kind as well as the method when setting a default or removing one", () => {
    const { resolver, service } = setup();

    resolver.setDefaultPaymentMethod(
      user,
      PaymentMethodKind.CreditCard,
      "method-id",
    );
    resolver.removePaymentMethod(
      user,
      PaymentMethodKind.BankAccount,
      "method-id",
    );

    expect(service.setDefault).toHaveBeenCalledWith(
      "alice",
      PaymentMethodKind.CreditCard,
      "method-id",
    );
    expect(service.remove).toHaveBeenCalledWith(
      "alice",
      PaymentMethodKind.BankAccount,
      "method-id",
    );
  });

  // Two tables, two id spaces: a method is not identified until you know
  // which kind it is, so every operation on one takes both.
  it("answers every mutation with the whole wallet, not the row it touched", () => {
    const { resolver, wallet } = setup();

    expect(resolver.addCreditCard(user, card)).toBe(wallet);
    expect(resolver.addBankAccount(user, account)).toBe(wallet);
    expect(
      resolver.setDefaultPaymentMethod(
        user,
        PaymentMethodKind.CreditCard,
        "method-id",
      ),
    ).toBe(wallet);
    expect(
      resolver.removePaymentMethod(
        user,
        PaymentMethodKind.CreditCard,
        "method-id",
      ),
    ).toBe(wallet);
  });
});
