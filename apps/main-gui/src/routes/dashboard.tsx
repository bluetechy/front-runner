import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "../app-chrome";
import { Dashboard } from "../dashboard";

/* Outside the `_site` layout: behind the login the marketing header is gone
 * and `app-chrome` supplies the rail and the top bar instead. */
export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});
