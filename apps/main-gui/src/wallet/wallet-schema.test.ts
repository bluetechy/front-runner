import { describe, expect, it } from "vitest";
import {
  accountTypes,
  bankAccountSchema,
  creditCardSchema,
  errorsOf,
  readExpiry,
} from "./wallet-schema";

/*
 * The browser's copy of main-api's rules. These tests are here to catch the
 * copy drifting: every case below has a twin in
 * apps/main-api/src/wallet/wallet.test.ts, and the two are meant to agree
 * about what is acceptable. See the note at the top of wallet-schema.ts.
 *
 * `readExpiry` has no twin, because turning MM/YY into a year is the one part
 * of this that is the browser's alone.
 */

const nextYear = new Date().getFullYear() + 2;

const validCard = {
  NameOnCard: "Matthew Mattson",
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
  RoutingNumber: "021000021",
  Number: "000123456789",
};

describe("what the add-a-card form accepts", () => {
  it("accepts a filled-in card", () => {
    expect(creditCardSchema.parse(validCard)).toMatchObject({
      NameOnCard: "Matthew Mattson",
    });
  });

  it("reads a number through the separators it is printed with", () => {
    expect(
      creditCardSchema.parse({ ...validCard, Number: "4111-1111 1111-1111" }),
    ).toMatchObject({ Number: "4111111111111111" });
  });

  it("catches a transposed pair of digits", () => {
    expect(
      creditCardSchema.safeParse({ ...validCard, Number: "4111111111111112" })
        .success,
    ).toBe(false);
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

  it.each(["12", "12345", "abc", ""])(
    "refuses %s as a security code",
    (SecurityCode) => {
      expect(
        creditCardSchema.safeParse({ ...validCard, SecurityCode }).success,
      ).toBe(false);
    },
  );

  // A card is good through the last day of the month printed on it.
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
    expect(
      creditCardSchema.safeParse({
        ...validCard,
        ExpirationMonth: 1,
        ExpirationYear: 2001,
      }).success,
    ).toBe(false);
  });

  it("requires a billing address", () => {
    expect(
      creditCardSchema.safeParse({ ...validCard, BillingLine1: "  " }).success,
    ).toBe(false);
  });

  // Plenty of addresses have no state, so this is the one billing field that
  // may be left empty.
  it("allows a billing address with no state", () => {
    expect(
      creditCardSchema.safeParse({ ...validCard, BillingState: "" }).success,
    ).toBe(true);
  });
});

describe("what the add-a-bank-account form accepts", () => {
  it("accepts a filled-in account", () => {
    expect(bankAccountSchema.parse(validAccount)).toMatchObject({
      RoutingNumber: "021000021",
    });
  });

  it.each(accountTypes)("accepts %s as an account type", (AccountType) => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, AccountType }).success,
    ).toBe(true);
  });

  it("refuses an account type it does not offer", () => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, AccountType: "Brokerage" })
        .success,
    ).toBe(false);
  });

  // The ABA check digit, which is Luhn's counterpart for a routing number.
  it("catches a wrong digit in a routing number", () => {
    expect(
      bankAccountSchema.safeParse({
        ...validAccount,
        RoutingNumber: "021000022",
      }).success,
    ).toBe(false);
  });

  it("requires a name on the account", () => {
    expect(
      bankAccountSchema.safeParse({ ...validAccount, NameOnAccount: " " })
        .success,
    ).toBe(false);
  });
});

describe("the expiry a card is printed with", () => {
  it.each([
    ["04/29", 4, 2029],
    ["4/29", 4, 2029],
    ["12 / 31", 12, 2031],
    ["04/2029", 4, 2029],
  ])("reads %s as month %i of %i", (typed, month, year) => {
    expect(readExpiry(typed)).toEqual({ month, year });
  });

  // Nothing readable came out, and the form reports that as the month being
  // wrong -- an unreadable expiry is a mistake in the field somebody typed
  // into, not a missing year.
  it.each(["", "0429", "April 2029", "//"])(
    "reads %s as nothing at all",
    (typed) => {
      expect(readExpiry(typed)).toEqual({ month: null, year: null });
    },
  );
});

describe("how the form is told what is wrong", () => {
  it("names every failing field at once", () => {
    const errors = errorsOf(creditCardSchema, {
      ...validCard,
      Number: "1",
      SecurityCode: "x",
      BillingCity: "",
    });
    expect(Object.keys(errors).toSorted()).toEqual([
      "BillingCity",
      "Number",
      "SecurityCode",
    ]);
  });

  it("says nothing about a card it accepts", () => {
    expect(errorsOf(creditCardSchema, validCard)).toEqual({});
  });
});
