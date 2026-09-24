import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "../authentication";

/*
 * Where the link in a password reset mail lands.
 *
 * On the marketing shell rather than behind the login, and that is not a
 * detail: somebody following this link cannot login, which is the whole
 * reason they are here. The token on the URL is the authorization.
 */
export const Route = createFileRoute("/_site/reset-password")({
  component: ResetPasswordRoute,
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
});

function ResetPasswordRoute() {
  const { token } = Route.useSearch();
  return <ResetPassword token={token} />;
}
