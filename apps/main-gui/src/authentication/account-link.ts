import { read, remove, write } from "../browser-storage";
import {
  accountLinkUrl,
  startRedirect,
  type TokenSet,
} from "./identity-provider";

/*
 * Connecting a provider to an account that is already logged in.
 *
 * It is two trips out of the page, and the reason there are two is worth
 * writing down.
 *
 * The provider will only run its linking flow for a browser it can see a
 * session cookie for, and it checks that cookie against the session the token
 * in hand was minted for. Our login card does not produce one: the password
 * grant it runs mints a token without ever sending the browser to the
 * provider, so there is no cookie and no matching session. Somebody who
 * logged in that way would be refused at the linking endpoint with the
 * provider's own error page, which is the worst place in this product for
 * somebody to end up.
 *
 * So Connect goes the long way round. The browser takes the ordinary
 * authorization-code trip first -- silent for anybody who already has a
 * session with the provider, a login page once for anybody who does not --
 * and the token that comes back is one the linking endpoint will accept. Then
 * it goes on to the provider, and comes back to the security page.
 *
 * What survives the trips is one alias in session storage. Not the token,
 * which the callback already has, and not a return address, which is a
 * constant: session storage because it is scoped to the tab making the trip
 * and dies with it, the same store the PKCE verifier uses for the same reason.
 */

const PENDING_KEY = "front-runner.linking-provider";

/* Where the provider drops the browser when the linking is over, one way or
 * the other. The claim on the end of it is a hint about what to go and check,
 * never something the page believes: main-api asks the provider before it
 * writes anything down. */
export const linkReturnUri = (alias: string): string =>
  `${window.location.origin}/security-and-access?connected=${encodeURIComponent(alias)}`;

/* Start the first trip. The hint is deliberately not sent: this leg is about
 * the account already logged in here, and a hint would send the browser
 * straight on to Google to login as somebody, which is the other feature. */
export async function beginAccountLink(alias: string): Promise<void> {
  write("session", PENDING_KEY, alias);
  await startRedirect({ kind: "login" });
}

/* The provider a trip is in the middle of connecting, taken rather than read:
 * a marker left behind would send the next login somewhere it was not asked
 * to go. */
export function takePendingAccountLink(): string | null {
  const alias = read("session", PENDING_KEY);
  remove("session", PENDING_KEY);
  return alias || null;
}

/*
 * The second trip, from the callback the first one lands on.
 *
 * True means the browser is on its way to the provider and whoever called
 * this should do nothing else. False means there is no linking endpoint
 * configured, or the token that came back names no session, and the caller
 * should carry on as if this had been an ordinary login: the account is
 * logged in either way, which is the half of this that must not be lost over
 * a connection that could not be started.
 */
export async function resumeAccountLink(
  alias: string,
  tokens: TokenSet,
): Promise<boolean> {
  const url = await accountLinkUrl(
    alias,
    tokens.accessToken,
    linkReturnUri(alias),
  );
  if (!url) return false;
  window.location.assign(url);
  return true;
}
