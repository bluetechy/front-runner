import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/index.js";
import { ZodPipe } from "../graphql/index.js";
import { PaymentMethodKind } from "./wallet.model.js";
import {
  bankAccountSchema,
  creditCardSchema,
  type BankAccountFields,
  type CreditCardFields,
} from "./wallet.schema.js";
import { WalletService } from "./wallet.service.js";

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

describe("what a card is allowed to contain", () => {
  it("accepts a filled-in card", () => {
    expect(creditCardSchema.parse(validCard)).toMatchObject({
      NameOnCard: "Matthew Mattson",
    });
  });

  // A person typing the groups printed on their card is reading it correctly.
  it("reads a number through the separators it is printed with", () => {
    expect(
      creditCardSchema.parse({ ...validCard, Number: "4111-1111 1111-1111" }),
    ).toMatchObject({ Number: "4111111111111111" });
  });

  // The mistake somebody actually makes typing sixteen digits.
  it("catches a transposed pair of digits", () => {
    const transposed = creditCardSchema.safeParse({
      ...validCard,
      Number: "4111111111111112",
    });
    expect(transposed.success).toBe(false);
  });

  it.each([
    ["too short", "41111111111"],
    ["not digits", "4111-XXXX-1111-1111"],
    ["empty", ""],
  ])("refuses a card number that is %s", (_why, Number) => {
    expect(creditCardSchema.safeParse({ ...validCard, Number }).success).toBe(
      false,
    );
  });

  it.each([["12"], ["12345"], ["abc"], [""]])(
    "refuses %s as a security code",
    (SecurityCode) => {
      expect(
        creditCardSchema.safeParse({ ...validCard, SecurityCode }).success,
      ).toBe(false);
    },
  );

  // A card is good through the last day of the month printed on it, so the
  // month it expires in is still a month it works in.
  it("accepts a card expiring this month", () => {
    const now = new Date();
    expect(
      creditCardSchema.safeParse({
        ...validCard,
        ExpirationMonth: now.getMonth() + 1,
        ExpirationYear: now.getFullYear(),
      }).success,
    ).toBe(true);
  });

  it("refuses a card that has already expired", () => {
    const refused = creditCardSchema.safeParse({
      ...validCard,
      ExpirationMonth: 1,
      ExpirationYear: 2001,
    });
    expect(refused.success).toBe(false);
  });

  it.each([[0], [13]])("refuses %s as an expiry month", (ExpirationMonth) => {
    expect(
      creditCardSchema.safeParse({ ...validCard, ExpirationMonth }).success,
    ).toBe(false);
  });

  // Two digits off a card become a year in the browser, once. Anything that
  // arrives still looking like two digits is a bug on the way in.
  it("refuses a two-digit expiry year", () => {
    expect(
      creditCardSchema.safeParse({ ...validCard, ExpirationYear: 29 }).success,
    ).toBe(false);
  });

  it("requires a billing address", () => {
    expect(
      creditCardSchema.safeParse({ ...validCard, BillingLine1: "  " }).success,
    ).toBe(false);
  });

  it("trims what it is given, so the database is not asked to", () => {
    expect(
      creditCardSchema.parse({ ...validCard, NameOnCard: "  Matthew  " }),
    ).toMatchObject({ NameOnCard: "Matthew" });
  });
});

describe("what a bank account is allowed to contain", () => {
  it("accepts a filled-in account", () => {
    expect(bankAccountSchema.parse(validAccount)).toMatchObject({
      RoutingNumber: "021000021",
    });
  });

  it.each([["Checking"], ["Savings"]])(
    "accepts %s as an account type",
    (AccountType) => {
      expect(
        bankAccountSchema.safeParse({ ...validAccount, AccountType }).success,
      ).toBe(true);
    },
  );

  it("refuses an account type it does not offer", () => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, AccountType: "Brokerage" })
        .success,
    ).toBe(false);
  });

  // The ABA check digit, which is Luhn's counterpart: it catches a typo in a
  // number nobody has memorised.
  it("catches a wrong digit in a routing number", () => {
    expect(
      bankAccountSchema.safeParse({
        ...validAccount,
        RoutingNumber: "021000022",
      }).success,
    ).toBe(false);
  });

  it("refuses a routing number that is not nine digits", () => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, RoutingNumber: "02100" })
        .success,
    ).toBe(false);
  });

  it("requires a name on the account", () => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, NameOnAccount: " " })
        .success,
    ).toBe(false);
  });
});

// The pipe is what the resolver actually runs, and it reports every failing
// field at once -- a form that has to be submitted once per mistake is a form
// nobody finishes.
describe("the pipe the resolver runs", () => {
  it("names every failing field in one answer", () => {
    const pipe = new ZodPipe<CreditCardFields>(creditCardSchema);
    try {
      pipe.transform({ ...validCard, Number: "1", SecurityCode: "x" });
      throw new Error("the pipe accepted an invalid card");
    } catch (failure) {
      expect(failure).toBeInstanceOf(BadRequestException);
      const message = (failure as BadRequestException).message;
      expect(message).toContain("Number");
      expect(message).toContain("SecurityCode");
    }
  });

  it("hands on what the schema parsed rather than what arrived", () => {
    const pipe = new ZodPipe<BankAccountFields>(bankAccountSchema);
    expect(
      pipe.transform({ ...validAccount, RoutingNumber: "021-000-021" }),
    ).toMatchObject({ RoutingNumber: "021000021" });
  });
});
