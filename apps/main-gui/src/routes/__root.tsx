import { Outlet, createRootRoute } from "@tanstack/react-router";
import { PageShell } from "../site-chrome";

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}
