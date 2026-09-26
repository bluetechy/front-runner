import { createFileRoute } from "@tanstack/react-router";
import { Security } from "../security";

/*
 * Security & Access, behind the login.
 *
 * Both search parameters are where the browser is dropped after this page
 * sent it somewhere: `connected` by a provider the SSO card asked to connect,
 * `configured` by the identity provider's own setup page after the
 * two-factor card asked for one. Each names what to go and check, and the
 * page checks it with the API rather than believing it: see `security.tsx`.
 */
export const Route = createFileRoute("/_app/security-and-access")({
  component: SecurityRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): { connected?: string; configured?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
    configured:
      typeof search.configured === "string" ? search.configured : undefined,
  }),
});

function SecurityRoute() {
  const { connected, configured } = Route.useSearch();
  return <Security connected={connected} configured={configured} />;
}
