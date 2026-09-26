import { z } from "zod";

/*
 * What may be named on the way in to this vertical. One thing: which passkey
 * an operation is about.
 */

/* The identity provider's handle for a passkey, as the page read it back.
 *
 * Deliberately not a UUID rule, though Keycloak's are UUIDs. The id is the
 * provider's to shape -- `Passkey.id` in the port says so -- and a vertical
 * that demanded a UUID would be a vertical that knows which provider is
 * behind the port, which is the one thing every file above
 * `identity-admin.service.ts` is kept from knowing.
 *
 * So what is checked is what this API actually needs of it: that there is
 * something there, and that it is not long enough to be somebody probing.
 * Whether it names a credential is the provider's answer, and it gives the
 * same one for an id that is well-formed and for an id that is invented: no
 * such credential, which `removePasskey` reads as done.
 */
export const passkeyIdSchema = z
  .string()
  .trim()
  .min(1, "That is not a passkey on this account.")
  .max(255, "That is not a passkey on this account.");
