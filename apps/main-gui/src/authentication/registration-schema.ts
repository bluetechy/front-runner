import { z } from "zod";
import { passwordSchema } from "./password-rules";

/*
 * What a new account is allowed to be, in the browser.
 *
 * A copy of main-api's `registration.schema.ts`, and the two are meant to say
 * the same thing. That one is the authority: this exists so the card can
 * refuse a typo without a round trip and say why beside the box, and so what
 * is sent is what was checked. The same arrangement the security page has
 * with `email-schema.ts`.
 *
 * The confirmation box is here and not there, and that is the one real
 * difference between the two. It is a typing aid: it is only meaningful next
 * to the box above it, and the API has no use for a second copy of a password
 * it is about to hash.
 */

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

/* The realm's password policy, read from `password-rules.ts` so that the
 * three cards that set a password say one thing between them. Keycloak is
 * what enforces it and main-api says it on the way in; this is the copy that
 * lets the box refuse a password beside itself. */
const password = passwordSchema;

export const registrationSchema = z
  .object({
    Username: username,
    Email: email,
    FirstName: personName("first name"),
    LastName: personName("last name"),
    Password: password,
    Confirm: z.string(),
  })
  /* Reported on the confirmation box rather than on the password, because
   * that is the box somebody is looking at when they get it wrong. */
  .refine((form) => form.Password === form.Confirm, {
    message: "The two passwords do not match",
    path: ["Confirm"],
  });

export type RegistrationForm = z.infer<typeof registrationSchema>;

/* What each box should say when it is wrong, keyed by field name; an empty
 * object means the form is good. Returned rather than thrown, because a form
 * wants sentences under its boxes and not an exception.
 *
 * Every field is reported, not just the first: a form that has to be
 * submitted once per mistake is a form nobody finishes. */
export function checkRegistration(
  form: RegistrationForm,
): Partial<Record<keyof RegistrationForm, string>> {
  const result = registrationSchema.safeParse(form);
  if (result.success) return {};

  const problems: Partial<Record<keyof RegistrationForm, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof RegistrationForm | undefined;
    /* The first sentence for each box wins: an empty username breaks two
     * rules and the shorter one is the one worth reading. */
    if (field && !problems[field]) problems[field] = issue.message;
  }
  return problems;
}
