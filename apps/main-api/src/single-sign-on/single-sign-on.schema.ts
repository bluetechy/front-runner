import { z } from "zod";

// What may be named as a provider.
//
// An alias is a slug the realm chose, and this is the shape Keycloak allows
// one to have: letters, digits, and the three joiners. It is not a list of the
// aliases we know about, deliberately -- the realm is what decides which
// providers exist, and an API that only accepted "google", "facebook" and
// "apple" would have to be rebuilt to add a fourth.
//
// It is checked at all because this string is put in a URL path at the
// provider. Everything below quotes it, so the schema is the belt rather than
// the braces, but a path segment is not a thing to take on trust from a
// request.
export const aliasSchema = z
  .string()
  .trim()
  .min(1, "Name the login provider")
  .max(255, "That is longer than any provider alias")
  .regex(/^[A-Za-z0-9._-]+$/, "That is not a login provider");
