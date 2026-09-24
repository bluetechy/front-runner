import { z } from "zod";

/*
 * What the two halves of a password reset are allowed to be on the way in.
 *
 * main-gui carries its own copy of these rules and the two are meant to say
 * the same thing. This one is the authority.
 */

/* What the forgot-password form asks for: a username or an email address,
 * because those are the two things Keycloak accepts at a login prompt and
 * somebody who has forgotten a password should not also have to remember
 * which of them they are known by.
 *
 * It is not checked against either shape, and deliberately: a rule that said
 * "this has no @, so it must be a username" would turn away nothing an
 * attacker could not retype, and would refuse the person who typed their
 * address with a trailing space into the username half of their memory. What
 * is worth doing here is the trimming and folding, so that what is searched
 * for is what was meant. Keycloak stores usernames folded, and addresses are
 * matched without regard to case.
 *
 * Nothing about the answer changes with what is typed: an identifier that
 * matches no account is answered exactly like one that does. */
export const identifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your username or email address")
  .max(255, "That is longer than any username or email address");

/* The token from a reset link. It is a UUID because that is what main-api
 * mints, and checking the shape here means a mangled link is refused before
 * it reaches a query. The sentence is the same one the database raises for a
 * token it does not know, because from the reader's side these are the same
 * thing: the link did not work. */
export const resetTokenSchema = z
  .string()
  .trim()
  .uuid("That password reset link is not valid or has already been used.");

/* The new password. The same rule the registration vertical states, for the
 * same reasons: the realm has no password policy of its own, so without this
 * a one-character password would be accepted, and bcrypt hashes 72 bytes and
 * ignores the rest. That copy is the authority for the password an account is
 * created with; this one is about the password that replaces it.
 *
 * The form's second box is not here and should not be: it is a typing aid, it
 * is only meaningful next to the first one, and the browser is where the two
 * are compared. */
export const newPasswordSchema = z
  .string()
  .min(8, "A password needs at least 8 characters")
  .max(72, "A password cannot be longer than 72 characters");
