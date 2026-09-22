import { describe, expect, it, jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/index.js";
import { PaymentMethodKind } from "./wallet.model.js";
import { bankAccountSchema, creditCardSchema } from "./wallet.schema.js";
import { WalletService } from "./wallet.service.js";

/*
 * What the wallet asks the database, and with what. The encryption key is the
 * configuration's and is passed to the two functions that need it; it is
 * never stored beside what it encrypts, which is the only thing that makes
 * encrypting the column worth anything.
 */

const KEY = "test-wallet-key-long-enough";

/* Far enough out that this file does not start failing on a date. */
const nextYear = new Date().getFullYear() + 2;

const validCard = {
  NameOnCard: "Matthew Mattson",
  // A published Visa test number: it passes Luhn and belongs to nobody.
  Number: "4111 1111 1111 1111",
  SecurityCode: "123",
  ExpirationMonth: 4,
  ExpirationYear: nextYear,
  BillingLine1: "2896 S 9150 W",
  BillingCity: "Magna",
  BillingState: "UT",
  BillingPostalCode: "84044",
  BillingCountry: "United States",
};

const validAccount = {
  NameOnAccount: "Matthew Mattson",
  AccountType: "Checking",
  // A real ABA routing number, published and widely used for testing.
  RoutingNumber: "021000021",
  Number: "000123456789",
};

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  const config = { getOrThrow: () => KEY } as unknown as ConfigService;
  return {
    query,
    service: new WalletService({ query } as unknown as DatabaseService, config),
  };
}

describe("the wallet a caller may read and write", () => {
  it("asks the database for the signed-in account's methods", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetPaymentMethods"'),
      ["member"],
    );
  });

  // Eleven positional parameters is the kind of thing that is wrong once and
  // then wrong forever, so the order is pinned here.
  it("passes a card in the order the function declares", async () => {
    const { service, query } = setup([]);
    await service.addCreditCard("member", creditCardSchema.parse(validCard));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"AddCreditCard"'),
      [
        "member",
        "Matthew Mattson",
        "4111111111111111",
        4,
        nextYear,
        "2896 S 9150 W",
        "Magna",
        "UT",
        "84044",
        "United States",
        KEY,
      ],
    );
  });

  it("passes a bank account in the order the function declares", async () => {
    const { service, query } = setup([]);
    await service.addBankAccount(
      "member",
      bankAccountSchema.parse(validAccount),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"AddBankAccount"'),
      [
        "member",
        "Matthew Mattson",
        "Checking",
        "021000021",
        "000123456789",
        KEY,
      ],
    );
  });

  // The one thing this module must never do. A security code has no column to
  // go in and no parameter to travel in; if one ever appears in a call, this
  // is what says so.
  it("never sends the security code to the database", async () => {
    const { service, query } = setup([]);
    await service.addCreditCard("member", creditCardSchema.parse(validCard));
    expect(query.mock.calls[0]?.[1]).not.toContain("123");
  });

  // Keeping the key out of the database is the only thing that makes
  // encrypting the column worth anything, so it travels per call.
  it("hands the database the encryption key on every write", async () => {
    const { service, query } = setup([]);
    await service.addCreditCard("member", creditCardSchema.parse(validCard));
    await service.addBankAccount(
      "member",
      bankAccountSchema.parse(validAccount),
    );
    for (const call of query.mock.calls) expect(call[1]).toContain(KEY);
  });

  // The login name is the token's, so a caller cannot reach into somebody
  // else's wallet by naming a method in it.
  it("acts on the wallet of the caller the token names", async () => {
    const { service, query } = setup([]);
    await service.setDefault(
      "member",
      PaymentMethodKind.BankAccount,
      "11111111-0000-4000-8000-000000000001",
    );
    await service.remove(
      "member",
      PaymentMethodKind.CreditCard,
      "11111111-0000-4000-8000-000000000001",
    );
    for (const call of query.mock.calls) expect(call[1]?.[0]).toBe("member");
  });
});
