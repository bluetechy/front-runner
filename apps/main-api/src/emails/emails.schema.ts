import { z } from "zod";

/*
 * What an address is allowed to be on the way in.
 *
 * The database checks shape too -- dbo.UserEmails."Email" has to hold an "@"
 * that is not the first character, and has to be folded and trimmed -- and
 * this is the stricter check in front of it, for the same reason the profile
 * has one: a refusal here is a sentence somebody reads, and a refusal there
 * is a constraint violation from a driver.
 *
 * main-gui carries its own copy of this and the two are meant to say the same
 * thing. This one is the authority.
 */

/* Folded and trimmed here, so that what is validated is what is sent and what
 * is stored. Doing it in one place means the length check below measures the
 * string that actually goes into the column. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter an email address")
  /* dbo.UserEmails."Email" is varchar(255). Over its limit is refused here
   * rather than truncated by Postgres, which would store a different address
   * from the one somebody typed. */
  .max(255, "An email address cannot be longer than 255 characters")
  /* Deliberately not RFC 5322. That grammar accepts things no mail server
   * will and rejecting on it is how valid addresses get turned away; what is
   * worth catching is the typo. So: something, an "@", something with a dot
   * in it, and no spaces anywhere. */
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Enter an email address, like you@example.com",
  );

export type EmailInput = z.infer<typeof emailSchema>;

/* The token from a verification link. It is a UUID because that is what
 * main-api mints, and checking the shape here means a malformed link is
 * refused before it reaches a query. */
export const verificationTokenSchema = z
  .string()
  .trim()
  .uuid("That verification link is not valid.");
