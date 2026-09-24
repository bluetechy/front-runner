import { z } from "zod";

/*
 * What the two halves of a password reset are allowed to be, in the browser.
 *
 * A copy of main-api's `password-reset.schema.ts`, and the two are meant to
 * say the same thing. That one is the authority: this exists so a card can
 * refuse a typo without a round trip and say why beside the box, the same
 * arrangement `registration-schema.ts` has.
 *
 * The confirmation box is here and not there, for the reason it is on the
 * sign-up form: it is a typing aid, only meaningful next to the box above it,
 * and the API has no use for a second copy of a password it is about to hand
 * to Keycloak.
 */

/* A username or an email address, and deliberately not checked against either
 * shape: Keycloak accepts both at a login prompt, and somebody who has
 * forgotten a password should not also have to remember which of them they
 * are known by. */
export const identifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your username or email address")
  .max(255, "That is longer than any username or email address");

/* The same rule the sign-up card states, because it is the same rule: eight
 * characters is the API's minimum, and the upper bound is bcrypt's. */
const password = z
  .string()
  .min(8, "A password needs at least 8 characters")
  .max(72, "A password cannot be longer than 72 characters");

export const newPasswordSchema = z
  .object({
    Password: password,
    Confirm: z.string(),
  })
  /* Reported on the confirmation box rather than on the password, because
   * that is the box somebody is looking at when they get it wrong. */
  .refine((form) => form.Password === form.Confirm, {
    message: "The two passwords do not match",
    path: ["Confirm"],
  });

export type NewPasswordForm = z.infer<typeof newPasswordSchema>;

/* What the one box on the forgot-password card should say when it is wrong,
 * or null when it is good. One sentence rather than the map the other two
 * hand back, because there is one box. */
export function checkIdentifier(identifier: string): string | null {
  const result = identifierSchema.safeParse(identifier);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

/* What each box on the new-password page should say when it is wrong, keyed
 * by field name; an empty object means the form is good.
 *
 * Every field is reported, not just the first: a form that has to be
 * submitted once per mistake is a form nobody finishes. */
export function checkNewPassword(
  form: NewPasswordForm,
): Partial<Record<keyof NewPasswordForm, string>> {
  const result = newPasswordSchema.safeParse(form);
  if (result.success) return {};

  const problems: Partial<Record<keyof NewPasswordForm, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof NewPasswordForm | undefined;
    /* The first sentence for each box wins. */
    if (field && !problems[field]) problems[field] = issue.message;
  }
  return problems;
}
