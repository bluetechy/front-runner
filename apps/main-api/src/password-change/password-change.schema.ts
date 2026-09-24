import { z } from "zod";

/*
 * What the change-password card is allowed to send.
 *
 * Only one of the two boxes has a rule of its own here. The new password is
 * `newPasswordSchema` from the password-reset vertical, imported rather than
 * restated: a product where the password you may reset to and the password you
 * may change to are different passwords is a product with a bug in it, and two
 * copies of a rule is how that bug gets written.
 *
 * main-gui carries its own copy of both and the two are meant to say the same
 * thing. This one is the authority for what reaches the API, and the realm is
 * the authority for what is actually allowed -- see
 * apps/keycloak-idp/realm/front-runner-realm.json.
 */

/* The password the account has now, checked for almost nothing.
 *
 * **The policy is deliberately not applied here.** This password was set under
 * whatever rules were in force when it was chosen, which for every account
 * older than the realm's `passwordPolicy` is no rules at all. Refusing it for
 * being eleven characters long would refuse the true answer, and would tell
 * somebody their current password is invalid when it is the password that gets
 * them in.
 *
 * So: not empty, because an empty box is a question rather than an answer, and
 * no longer than bcrypt hashes, because nothing beyond that was ever part of
 * the password. Whether it is right is the identity provider's to say, and it
 * is the only thing that can say it.
 */
export const currentPasswordSchema = z
  .string()
  .min(1, "Enter the password you use now")
  .max(72, "A password cannot be longer than 72 characters");
