#!/usr/bin/env node
/*
 * The password credential for a seeded account in the realm import, already
 * hashed.
 *
 * The seeded accounts each have their username as their password, which is
 * exactly what this realm's own `passwordPolicy` forbids: twelve characters,
 * an upper case, a digit, a special character, and not the username. Keycloak
 * applies that policy to a raw `"value"` in the import, so a realm file
 * carrying those passwords in the clear cannot be imported at all -- the
 * container starts, fails the import and exits.
 *
 * A credential that arrives already hashed is not a password anybody is
 * choosing, so Keycloak imports it as it stands. That is how its own realm
 * exports come back in, and it is what lets the seeded accounts keep the
 * memorable credentials the README documents while the policy keeps applying
 * to every password a person actually sets.
 *
 * Run it to regenerate one:
 *
 *     node apps/keycloak-idp/bin/seed-credential.mjs testuser
 *
 * and paste the object it prints into the account's "credentials" array in
 * realm/front-runner-realm.json. The salt is random, so the same password
 * prints differently every time; that is the point of a salt, and two seeded
 * accounts sharing a password must not share a hash.
 *
 * pbkdf2-sha512 rather than the argon2 Keycloak now hashes new passwords
 * with: the algorithm travels in the credential, so Keycloak verifies each
 * one the way it was written, and this is the strongest of the three it can
 * be handed from a script with no dependencies. A password somebody changes
 * through the application is rehashed with whatever the realm's policy says,
 * which is argon2 -- these hashes are the seed data's, not the product's.
 */

import { pbkdf2Sync, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

/* Keycloak's own defaults for this provider, in
 * Pbkdf2Sha512PasswordHashProviderFactory. The iterations are written into the
 * credential, so Keycloak verifies with the number used here rather than with
 * today's default; the key size is not, so it has to be the one the provider
 * derives with. */
const ITERATIONS = 210_000;
const KEY_BYTES = 64;
const SALT_BYTES = 16;

export function seedCredential(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_BYTES, "sha512");

  return {
    type: "password",
    /* Not temporary: a seeded account that demanded a new password at first
     * login would break the very dialog it exists to exercise. */
    temporary: false,
    secretData: JSON.stringify({
      value: hash.toString("base64"),
      salt: salt.toString("base64"),
      additionalParameters: {},
    }),
    credentialData: JSON.stringify({
      hashIterations: ITERATIONS,
      algorithm: "pbkdf2-sha512",
      additionalParameters: {},
    }),
  };
}

/* Only when it was run rather than imported, so that a script rewriting every
 * seeded account can borrow the function above without printing anything. */
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [password] = process.argv.slice(2);
  if (!password) {
    console.error("usage: seed-credential.mjs <password>");
    process.exit(1);
  }
  console.log(JSON.stringify(seedCredential(password), null, 2));
}
