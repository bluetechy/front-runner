import { z } from "zod";

/*
 * What an address is allowed to be, in the browser.
 *
 * A copy of main-api's `emails.schema.ts`, and the two are meant to say the
 * same thing. That one is the authority: this exists so the form can refuse a
 * typo without a round trip and say why beside the box, and so the address
 * that is sent is the one that was checked. The same arrangement the profile
 * form has with `profiles.schema.ts`.
 *
 * Deliberately not RFC 5322. That grammar accepts things no mail server will,
 * and rejecting on it is how valid addresses get turned away; what is worth
 * catching is the typo. So: something, an "@", something with a dot in it,
 * and no spaces anywhere.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter an email address")
  /* dbo.UserEmails."Email" is varchar(255). */
  .max(255, "An email address cannot be longer than 255 characters")
  .regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    "Enter an email address, like you@example.com",
  );

/* What the box should say when it is wrong, or null when it is not. Returned
 * rather than thrown, because a form field wants a sentence under it and not
 * an exception. */
export function checkEmail(value: string): string | null {
  const result = emailSchema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}
