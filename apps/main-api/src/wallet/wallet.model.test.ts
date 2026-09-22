import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import {
  BankAccountInput,
  CreditCardInput,
  PaymentMethod,
  PaymentMethodKind,
} from "./wallet.model.js";

/*
 * One list holding both kinds of saved payment method, and the two inputs
 * that add to it.
 *
 * The assertion this file exists for is the one about what is *not* here: a
 * card number appears once, on the way in, and never comes back. If
 * `PaymentMethod` ever grows a `Number`, this fails -- which is the point.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

describe("a saved payment method", () => {
  it("says which kind it is, so a reader knows what to branch on", () => {
    expect(typeOf(PaymentMethod.prototype, "Kind")).toBe(String);
    expect(Object.values(PaymentMethodKind)).toEqual([
      "CreditCard",
      "BankAccount",
    ]);
  });

  it.each([
    ["PaymentMethodUUID", String],
    ["NameOnMethod", String],
    ["Last4", String],
    ["IsDefault", Boolean],
    ["CreatedAt", Date],
  ])("exposes %s, whichever kind it is", (field, type) => {
    expect(typeOf(PaymentMethod.prototype, field)).toBe(type);
  });

  // A null in this shape is never "unanswered" -- every column behind it is
  // NOT NULL. It means "this kind does not have that": a bank account has no
  // expiry, a card has no routing number.
  it.each([
    "Brand",
    "ExpirationMonth",
    "ExpirationYear",
    "AccountType",
    "RoutingNumber",
  ])("leaves %s null on the kind that does not have it", (field) => {
    expect(typeOf(PaymentMethod.prototype, field)).toBe(Object);
  });

  // A fact about today rather than a stored one, so it cannot go stale in the
  // row. A bank account never expires and reports false.
  it("answers whether it has expired, always", () => {
    expect(typeOf(PaymentMethod.prototype, "IsExpired")).toBe(Boolean);
  });

  it.each(["Number", "CardNumber", "SecurityCode", "AccountNumber"])(
    "never hands back %s",
    (field) => {
      expect(typeOf(PaymentMethod.prototype, field)).toBeUndefined();
    },
  );
});

describe("adding a card", () => {
  it("takes the number and the code, and nothing else about the person", () => {
    expect(fields(CreditCardInput).toSorted()).toEqual(
      [
        "NameOnCard",
        "Number",
        "SecurityCode",
        "ExpirationMonth",
        "ExpirationYear",
        "BillingLine1",
        "BillingCity",
        "BillingState",
        "BillingPostalCode",
        "BillingCountry",
      ].toSorted(),
    );
  });

  // In full, as 2029. A card prints two digits; turning those into a year is
  // the browser's job, done once, rather than a guess made in three places.
  it("takes the expiry as a month and a whole year", () => {
    expect(typeOf(CreditCardInput.prototype, "ExpirationMonth")).toBe(Number);
    expect(typeOf(CreditCardInput.prototype, "ExpirationYear")).toBe(Number);
  });
});

describe("adding a bank account", () => {
  it("takes the four things a transfer needs", () => {
    expect(fields(BankAccountInput).toSorted()).toEqual(
      ["NameOnAccount", "AccountType", "RoutingNumber", "Number"].toSorted(),
    );
  });

  // A routing number names a bank, not an account, so it is stored and shown
  // in the clear.
  it("keeps the routing number as text rather than as a secret", () => {
    expect(typeOf(BankAccountInput.prototype, "RoutingNumber")).toBe(String);
  });
});
