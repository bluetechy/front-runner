import { z } from "zod";

/*
 * What a new account is allowed to be on the way in.
 *
 * Keycloak checks its own realm rules behind this and answers 400 with a
 * sentence when it refuses; this is the check in front, so that the ordinary
 * mistakes -- a blank field, a typo in an address, a password too short to be
 * one -- are answered in this application's words and all at once. A form that
 * has to be submitted once per mistake is a form nobody finishes, which is
 * what ZodPipe reporting every issue is for.
 *
 * The form's second password box is not here and should not be: it is a
 * typing aid, it is only meaningful next to the first one, and the browser is
 * where the two are compared.
 *
 * main-gui carries its own copy of these rules and the two are meant to say
 * the same thing. This one is the authority.
 */

/* Keycloak folds a username to lower case when it stores it, so it is folded
 * here: what is validated is then what is stored, and two people cannot pick
 * names that differ only in case and believe they are different. The character
 * set is deliberately narrow -- a username is typed, said out loud and put in
 * a URL. */
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "A username needs at least 3 characters")
  .max(64, "A username cannot be longer than 64 characters")
  .regex(
    /^[a-z0-9._-]+$/,
    "A username can hold letters, digits, dots, dashes and underscores",
  );

/* The same rule the emails vertical states, for the same reasons: folded and
 * trimmed so what is checked is what is stored, and a shape that catches the
 * typo rather than a grammar that turns real addresses away. That copy is the
 * authority for an address on file; this one is about the address an account
 * is created with. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter an email address")
  .max(255, "An email address cannot be longer than 255 characters")
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Enter an email address, like you@example.com",
  );

const personName = (field: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${field}`)
    .max(64, `A ${field} cannot be longer than 64 characters`);

/* Eight characters, which is more than the realm asks for today: it has no
 * password policy set, so without this the API would accept a one-character
 * password. A minimum stated here is a sentence somebody reads rather than a
 * refusal from Keycloak in its own words. The upper bound is bcrypt's: past
 * 72 bytes the rest is not hashed, so accepting more would be pretending. */
const password = z
  .string()
  .min(8, "A password needs at least 8 characters")
  .max(72, "A password cannot be longer than 72 characters");

export const registrationSchema = z.object({
  Username: username,
  Email: email,
  FirstName: personName("first name"),
  LastName: personName("last name"),
  Password: password,
});

export type NewAccountInput = z.infer<typeof registrationSchema>;
