import { z } from "zod";

/*
 * What may be named and typed on the way in to this vertical.
 *
 * main-gui carries its own copy of the recovery-code shape, and the two are
 * meant to say the same thing. This one is the authority.
 */

/* Which kind of second factor an operation is about.
 *
 * A closed list, unlike `aliasSchema` next door, and the difference is who
 * decides. Login providers are whatever the realm has been given, so that
 * schema takes any well-formed alias; second factors are what this product
 * has built a row, a flow and a sentence for, and a fourth kind cannot arrive
 * without a release either way. An unknown kind is a request for something
 * that does not exist, and saying so is better than carrying it as far as the
 * identity provider to be refused there in its own words. */
export const kindSchema = z.enum(["authenticator-app", "sms"], {
  message: "That is not a two-factor method",
});

/* One recovery code, as somebody typed it.
 *
 * Folded and stripped of the spaces and dashes that a code read off paper
 * collects, because what is compared is a hash: "abcde-fghij", "ABCDE FGHIJ"
 * and "abcdefghij" are the same code to the person holding the sheet, and
 * would be three different hashes to this API. The hyphen the codes are
 * printed with is a reading aid, so it is taken out here rather than demanded.
 *
 * The length is checked after that folding and is exactly what
 * `generateRecoveryCodes` makes, so a code that could not possibly be one is
 * refused before a hash is computed and a query is made. The sentence is the
 * one a wrong code gets, because from the reader's side these are the same
 * thing: it did not work. */
export const recoveryCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((code) => code.replace(/[\s-]/g, ""))
  .refine(
    (code) => /^[a-z0-9]{10}$/.test(code),
    "That recovery code is not valid or has already been used.",
  );
