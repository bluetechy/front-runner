import { read, remove, write } from "../browser-storage";
import { startRedirect } from "./identity-provider";

/*
 * Registering a passkey, which happens at the identity provider and nowhere
 * else.
 *
 * The same trip `second-factor-setup.ts` makes, for a sharper reason. An
 * authenticator app cannot be set up here because the secret is minted at the
 * provider and shown once; a passkey cannot be registered here because of
 * where the ceremony has to happen. The browser's own WebAuthn call is bound
 * to the origin it is made from, and the credential it makes will only ever
 * be offered back to that origin. A passkey made at `localhost:30001` is a
 * passkey Keycloak has never heard of and will never be shown. So the browser
 * goes to the provider, the provider's page runs the ceremony against its own
 * origin, and the browser comes back.
 *
 * **One trip, not the two connecting a provider takes**, for the reason
 * written on `second-factor-setup.ts`: this goes through the authorize
 * endpoint, which is the thing that produces the session cookie rather than
 * the thing that needs one.
 *
 * What says a trip was made at all is one marker in session storage -- scoped
 * to the tab making the trip and dying with it, the same store the PKCE
 * verifier uses for the same reason. What the provider puts on the URL to say
 * how the ceremony ended is carried too, but only far enough to tell an
 * abandoned trip from a finished one: a URL saying a passkey *was* registered
 * is a claim, and the security page asks main-api what the account actually
 * holds, and main-api asks the provider, before it believes a word of it. See
 * `passkeyReturnPath` at the bottom for why the two directions are not
 * treated alike.
 *
 * There is nothing in here about logging in *with* a passkey, and that is not
 * an omission this file can fix. This product's login card trades an email
 * address and a password for tokens directly, and a password grant has no
 * browser in it to run a ceremony. Until the login card can hand a browser to
 * the provider's own page, a passkey registered here is a credential the
 * account holds and cannot yet spend: the card says so, in those words, and
 * docs/TODO.md says what unblocks it.
 */

const PENDING_KEY = "front-runner.registering-passkey";

/* Whether this deployment can register one at all.
 *
 * A question about configuration, exactly as the authenticator app's is: two
 * empty values and there is nowhere to send the browser, so the card draws no
 * Add passkey button rather than a button that sends somebody nowhere. The
 * same rule an empty link path applies to the SSO card. */
export function canRegisterPasskey(): boolean {
  return (
    import.meta.env.VITE_IDP_PASSKEY_ACTION !== "" &&
    import.meta.env.VITE_IDP_ACTION_PARAMETER !== ""
  );
}

/*
 * Start the trip. Nothing waits for it, because there is nothing to wait for:
 * the page is gone the moment this runs.
 */
export async function beginPasskeyRegistration(): Promise<void> {
  const action = import.meta.env.VITE_IDP_PASSKEY_ACTION;
  if (!action) throw new Error("This site cannot add a passkey for you yet.");
  write("session", PENDING_KEY, "yes");
  await startRedirect({ kind: "login", action });
}

/* Whether a trip is in the middle of registering one, taken rather than read:
 * a marker left behind would send the next ordinary login to the security
 * page claiming a passkey had just been added. */
export function takePendingPasskey(): boolean {
  const pending = read("session", PENDING_KEY);
  remove("session", PENDING_KEY);
  return pending === "yes";
}

/*
 * Where the browser is sent once the callback has traded its code, given
 * whatever the provider put on the URL to say how the ceremony ended.
 *
 * Keycloak answers with `kc_action_status`, which is `success` when a
 * credential was made, `cancelled` when the browser's own dialog was
 * dismissed, and `error` when the ceremony itself failed. That is more than
 * this page needs, so it comes out of here as one of two words, and those two
 * are the whole vocabulary the security page has to know. Keycloak's spelling
 * stops at this function, the way every other provider detail does.
 *
 * `registered` remains a hint and nothing more: the page asks main-api what
 * the account actually holds before it says a passkey was added. `cancelled`
 * **is** believed, and the asymmetry is the point. A URL claiming a passkey
 * was added, when none was, would have somebody walk away from a card
 * believing they can login with their face. A URL claiming one was not added,
 * when it was, costs a sentence saying nothing changed above a list that
 * plainly shows it there. One of those is worth a round trip to the provider
 * and the other is not.
 */
export const passkeyReturnPath = (status: string | null): string =>
  status === "cancelled" || status === "error"
    ? "/security-and-access?passkey=cancelled"
    : "/security-and-access?passkey=registered";
