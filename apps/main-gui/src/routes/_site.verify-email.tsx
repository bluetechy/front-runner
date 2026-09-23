import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmail } from "../security";

/*
 * Where the link in a verification mail lands.
 *
 * On the marketing shell rather than behind the login on purpose: the link is
 * opened by whoever reads the mailbox, which is the thing being proved, and
 * that may be a browser with no session in it. The token on the URL is the
 * authorization.
 */
export const Route = createFileRoute("/_site/verify-email")({
  component: VerifyEmailRoute,
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
});

function VerifyEmailRoute() {
  const { token } = Route.useSearch();
  return <VerifyEmail token={token} />;
}
