import { read, remove, write } from "../browser-storage";
import { startRedirect } from "./identity-provider";

/*
 * Turning on an authenticator app, which happens at the identity provider and
 * nowhere else.
 *
 * Only the authenticator app. SMS is set up on the security page itself, in a
 * dialog, because there is no secret to mint: a phone number is proved by a
 * message sent to it and typed back, which needs no browser sent anywhere.
 * See apps/main-gui/src/security/sms-dialog.tsx.
 *
 * The secret behind an authenticator app is minted by the provider and shown
 * to a person exactly once, as a QR code on a page. No admin API hands one
 * out -- Keycloak's has no operation that creates an OTP credential at all --
 * so there is no version of this where our own page draws the code. The
 * browser goes to the provider, the provider runs its setup page, and the
 * browser comes back.
 *
 * **One trip, not the two connecting a provider takes.** `account-link.ts`
 * needs the first trip because the linking endpoint checks a session cookie
 * the password grant never produced; this goes through the authorize endpoint,
 * which is the thing that produces that cookie. Somebody who logged in on the
 * card meets the provider's login page once on the way; somebody who arrived
 * through Google goes straight through.
 *
 * What survives the trip is one kind in session storage -- scoped to the tab
 * making the trip and dying with it, the same store the PKCE verifier uses for
 * the same reason. Not the status the provider puts on the URL, which is a
 * claim: the security page hands the kind to main-api, and main-api asks the
 * provider what the account actually holds before it believes a word of it.
 */

const PENDING_KEY = "front-runner.configuring-factor";

/* Whether this deployment can set this kind up at all.
 *
 * For the authenticator app that is a question about configuration: two empty
 * values and there is nothing to send the browser with, so the card draws no
 * Turn on button rather than a button that sends somebody nowhere, the same
 * way an empty link path leaves the SSO card reading only.
 *
 * For SMS it is always true, because nothing here is involved: the dialog on
 * the security page asks main-api to text a code. Whether main-api has
 * anywhere to text it to is a different question with a different answer, and
 * it is on the row itself as `Available`. */
export function canConfigureSecondFactor(kind: string): boolean {
  if (kind === "sms") return true;
  return (
    actionFor(kind) !== "" && import.meta.env.VITE_IDP_ACTION_PARAMETER !== ""
  );
}

/* What the provider calls the action that sets this kind up. Only the
 * authenticator app has one: an SMS factor is a number on the account rather
 * than a credential the provider mints, so there is no setup page to ask for. */
function actionFor(kind: string): string {
  return kind === "authenticator-app"
    ? import.meta.env.VITE_IDP_TOTP_ACTION
    : "";
}

/*
 * Start the trip. Nothing waits for it, because there is nothing to wait for:
 * the page is gone the moment this runs.
 */
export async function beginSecondFactorSetup(kind: string): Promise<void> {
  const action = actionFor(kind);
  if (!action) throw new Error("This site cannot set that up for you yet.");
  write("session", PENDING_KEY, kind);
  await startRedirect({ kind: "login", action });
}

/* The kind a trip is in the middle of setting up, taken rather than read: a
 * marker left behind would send the next ordinary login to the security page
 * claiming something had just been configured. */
export function takePendingSecondFactor(): string | null {
  const kind = read("session", PENDING_KEY);
  remove("session", PENDING_KEY);
  return kind || null;
}

/* Where the browser is sent once the callback has traded its code. The claim
 * on the end is a hint about what to go and check, never something the page
 * believes. */
export const setupReturnPath = (kind: string): string =>
  `/security-and-access?configured=${encodeURIComponent(kind)}`;
