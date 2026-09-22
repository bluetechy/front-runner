import { z } from "zod";

/*
 * What may be saved to a wallet.
 *
 * The same arrangement the profile has: the rules are here, main-gui carries a
 * copy so the form can say which field is wrong while somebody is still
 * looking at it, and **this one is the authority** -- a request that reaches
 * the mutation is checked here whatever the form did or did not do.
 *
 * The database checks shape as well, and deliberately less: it refuses
 * anything its columns cannot hold. What is here is the part that needs to
 * know what the digits *mean* -- that a card number passes its check digit,
 * that a routing number names a bank that exists, that an expiry has not
 * already passed. See apps/main-db/sql/Functions/AddCreditCard.sql.
 *
 * A number is checked after its separators are stripped, and it is the
 * stripped form that is sent on: a person typing the groups printed on their
 * card is reading it correctly, and the spaces are presentation.
 */

export const ACCOUNT_TYPES = ["Checking", "Savings"] as const;

/* Spaces and dashes are how a long number is printed to be read aloud. */
const digitsOnly = (value: string) => value.replace(/[\s-]/g, "");

/*
 * Luhn. Double every second digit from the right, subtract 9 from anything
 * over 9, and the total is divisible by ten. Every card network's numbers
 * satisfy it, which makes it the one check that catches a transposed pair --
 * the mistake a person actually makes typing sixteen digits -- without asking
 * anybody's server.
 */
function passesLuhn(number: string): boolean {
  let total = 0;
  let double = false;
  for (let index = number.length - 1; index >= 0; index -= 1) {
    let digit = number.charCodeAt(index) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
    double = !double;
  }
  return total % 10 === 0;
}

/*
 * The ABA check digit, which is Luhn's counterpart for a routing number:
 * weights of 3, 7 and 1 across the nine digits, and the total is divisible by
 * ten. It is worth doing for the same reason -- it catches a typo in a number
 * nobody has memorised, at the point where the person can still look it up.
 */
function passesAba(routing: string): boolean {
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  const total = routing
    .split("")
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (weights[index] ?? 0),
      0,
    );
  return total % 10 === 0;
}

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot be longer than ${max} characters`);

const required = (max: number, label: string) =>
  text(max, label).min(1, `${label} is required`);

const cardNumber = z
  .string()
  .transform(digitsOnly)
  .refine(
    (value) => /^[0-9]{12,19}$/.test(value),
    "A card number is between 12 and 19 digits",
  )
  .refine(passesLuhn, "Check the card number — a digit looks wrong");

/* Three digits, or four on an American Express. Never stored; see the input
 * type in wallet.model.ts for why it is taken at all. */
const securityCode = z
  .string()
  .trim()
  .regex(/^[0-9]{3,4}$/, "A security code is three or four digits");

const accountNumber = z
  .string()
  .transform(digitsOnly)
  .refine(
    (value) => /^[0-9]{4,17}$/.test(value),
    "An account number is between 4 and 17 digits",
  );

const routingNumber = z
  .string()
  .transform(digitsOnly)
  .refine(
    (value) => /^[0-9]{9}$/.test(value),
    "A routing number is nine digits",
  )
  .refine(passesAba, "Check the routing number — a digit looks wrong");

/* Written in full, as 2029. The two digits printed on a card become a year in
 * the browser, once, rather than being guessed at here as well. The ceiling is
 * the column's; the floor is this century, because a year below it is a typo
 * rather than an expiry. */
const expirationYear = z
  .number()
  .int("An expiry year is a whole number")
  .min(2000, "Write the expiry year in full, as 2029")
  .max(2099, "That expiry year is too far away to be a card");

export const creditCardSchema = z
  .object({
    NameOnCard: required(64, "Name on card"),
    Number: cardNumber,
    SecurityCode: securityCode,
    ExpirationMonth: z
      .number()
      .int("An expiry month is a whole number")
      .min(1, "An expiry month is a number from 1 to 12")
      .max(12, "An expiry month is a number from 1 to 12"),
    ExpirationYear: expirationYear,
    BillingLine1: required(255, "Billing address"),
    BillingCity: required(64, "Billing city"),
    BillingState: text(64, "Billing state"),
    BillingPostalCode: required(16, "Billing postal code"),
    BillingCountry: required(64, "Billing country"),
  })
  /*
   * A card is good through the last day of the month printed on it, so this is
   * "has it run out", not "is it this month". It is refused rather than warned
   * about: a card already expired cannot be charged, so saving one would be
   * saving something that does not work. A card that expires *while* it sits
   * in the wallet is a different thing and stays there, marked expired.
   */
  .refine(
    (card) => {
      const now = new Date();
      const thisMonth = now.getFullYear() * 12 + now.getMonth();
      const expires = card.ExpirationYear * 12 + (card.ExpirationMonth - 1);
      return expires >= thisMonth;
    },
    { message: "That card has already expired", path: ["ExpirationMonth"] },
  );

export const bankAccountSchema = z.object({
  NameOnAccount: required(64, "Name on bank account"),
  AccountType: z.enum(ACCOUNT_TYPES, {
    message: "Choose either Checking or Savings",
  }),
  RoutingNumber: routingNumber,
  Number: accountNumber,
});

export type CreditCardFields = z.infer<typeof creditCardSchema>;
export type BankAccountFields = z.infer<typeof bankAccountSchema>;
