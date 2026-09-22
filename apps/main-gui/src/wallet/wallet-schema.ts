import { z } from "zod";

/*
 * What may be saved to a wallet, in the browser.
 *
 * A copy of main-api's `wallet.schema.ts`, for the same reason
 * `profile-schema.ts` is a copy of its counterpart: the two apps are built and
 * shipped separately -- each image installs only its own workspace -- so there
 * is nowhere a shared schema could live today without a new package and the
 * build and Compose changes that come with it.
 *
 * **The API's copy is the authority.** This one exists so the form can say
 * which field is wrong while somebody is still looking at it, and the dialog
 * shows what the API said when the two disagree — so the failure mode of this
 * file drifting is a message arriving a moment later rather than a bad card
 * being saved.
 */

export const accountTypes = ["Checking", "Savings"] as const;

const digitsOnly = (value: string) => value.replace(/[\s-]/g, "");

/* Luhn: double every second digit from the right, subtract 9 from anything
 * over 9, and the total is divisible by ten. It catches a transposed pair,
 * which is the mistake somebody actually makes typing sixteen digits, without
 * asking anybody's server. */
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

/* The ABA check digit, Luhn's counterpart for a routing number: weights of 3,
 * 7 and 1, and the total is divisible by ten. */
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

export const creditCardSchema = z
  .object({
    NameOnCard: required(64, "Name on card"),
    Number: z
      .string()
      .transform(digitsOnly)
      .refine(
        (value) => /^[0-9]{12,19}$/.test(value),
        "A card number is between 12 and 19 digits",
      )
      .refine(passesLuhn, "Check the card number — a digit looks wrong"),
    SecurityCode: z
      .string()
      .trim()
      .regex(/^[0-9]{3,4}$/, "A security code is three or four digits"),
    ExpirationMonth: z
      .number()
      .int("An expiry month is a whole number")
      .min(1, "An expiry month is a number from 1 to 12")
      .max(12, "An expiry month is a number from 1 to 12"),
    ExpirationYear: z
      .number()
      .int("An expiry year is a whole number")
      .min(2000, "Write the expiry year in full, as 2029")
      .max(2099, "That expiry year is too far away to be a card"),
    BillingLine1: required(255, "Billing address"),
    BillingCity: required(64, "Billing city"),
    BillingState: text(64, "Billing state"),
    BillingPostalCode: required(16, "Billing postal code"),
    BillingCountry: required(64, "Billing country"),
  })
  /* A card is good through the last day of the month printed on it, so this
   * asks whether it has run out rather than whether it is this month. */
  .refine(
    (card) => {
      const now = new Date();
      const thisMonth = now.getFullYear() * 12 + now.getMonth();
      return card.ExpirationYear * 12 + (card.ExpirationMonth - 1) >= thisMonth;
    },
    { message: "That card has already expired", path: ["ExpirationMonth"] },
  );

export const bankAccountSchema = z.object({
  NameOnAccount: required(64, "Name on bank account"),
  AccountType: z.enum(accountTypes, {
    message: "Choose either Checking or Savings",
  }),
  RoutingNumber: z
    .string()
    .transform(digitsOnly)
    .refine(
      (value) => /^[0-9]{9}$/.test(value),
      "A routing number is nine digits",
    )
    .refine(passesAba, "Check the routing number — a digit looks wrong"),
  Number: z
    .string()
    .transform(digitsOnly)
    .refine(
      (value) => /^[0-9]{4,17}$/.test(value),
      "An account number is between 4 and 17 digits",
    ),
});

export type CreditCardFields = z.infer<typeof creditCardSchema>;
export type BankAccountFields = z.infer<typeof bankAccountSchema>;

/* Which field said what, so a message can be shown under the control that
 * caused it. Keyed by the parsed shape rather than by what the form holds:
 * the expiry is one field on screen and two in the schema, and the form maps
 * the one back onto the other. */
export type FieldErrors = Record<string, string | undefined>;

export function errorsOf(schema: z.ZodType, input: unknown): FieldErrors {
  const result = schema.safeParse(input);
  if (result.success) return {};

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    /* The first message per field: a second one about the same field is
     * usually the same mistake said differently. */
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/*
 * A card prints its expiry as MM/YY and that is how it is typed, so the two
 * digits become a year here -- once, in the browser -- rather than being
 * guessed at again in the API and a third time in the database. A card is not
 * issued for the last century, so "29" is 2029.
 *
 * Returns nulls for anything that is not two numbers, which the schema then
 * reports as the month being wrong: an unreadable expiry is a mistake in the
 * field the person typed into, not a missing year.
 */
export function readExpiry(value: string): {
  month: number | null;
  year: number | null;
} {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})\s*$/.exec(value);
  if (!match) return { month: null, year: null };
  const year = Number(match[2]);
  return {
    month: Number(match[1]),
    year: year < 100 ? 2000 + year : year,
  };
}
