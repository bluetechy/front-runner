import { createFileRoute } from "@tanstack/react-router";
import { Security } from "../security";

/*
 * Security & Access, behind the login.
 *
 * All three search parameters are where the browser is dropped after this
 * page sent it somewhere: `connected` by a provider the SSO card asked to
 * connect, `configured` by the identity provider's own setup page after the
 * two-factor card asked for one, and `passkey` by the same page after the
 * passkeys card asked for a registration. Each names what to go and check,
 * and the page checks it with the API rather than believing it: see
 * `security.tsx`.
 *
 * The third carries no name, unlike the other two, because there is nothing
 * to name: an account has a list of passkeys rather than one row per kind,
 * so all a returning browser can say is that it went.
 */
export const Route = createFileRoute("/_app/security-and-access")({
  component: SecurityRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): { connected?: string; configured?: string; passkey?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
    configured:
      typeof search.configured === "string" ? search.configured : undefined,
    passkey: typeof search.passkey === "string" ? search.passkey : undefined,
  }),
});

function SecurityRoute() {
  const { connected, configured, passkey } = Route.useSearch();
  return (
    <Security connected={connected} configured={configured} passkey={passkey} />
  );
}
