import { createFileRoute } from "@tanstack/react-router";
import { Security } from "../security";

/*
 * Security & Access, behind the login.
 *
 * The one search parameter is where a provider drops the browser after the
 * SSO card sent it off to connect an account. It names what to go and check,
 * and the page checks it with the API rather than believing it: see
 * `security.tsx`.
 */
export const Route = createFileRoute("/_app/security-and-access")({
  component: SecurityRoute,
  validateSearch: (
    search: Record<string, unknown>,
  ): { connected?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
  }),
});

function SecurityRoute() {
  const { connected } = Route.useSearch();
  return <Security connected={connected} />;
}
