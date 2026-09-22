import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageShell } from "../site-chrome";

/* The marketing pages: the violet field, the header, and the sign-in dialog
 * the header opens. Pathless, so the URLs beneath it are unchanged. */
export const Route = createFileRoute("/_site")({
  component: () => (
    <PageShell>
      <Outlet />
    </PageShell>
  ),
});
