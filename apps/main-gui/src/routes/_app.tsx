import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../app-chrome";
import { useSession } from "../authentication";
import { ProfileProvider } from "../profile";

/*
 * Everything behind the login. Pathless, so the URLs under it are what they
 * say: /dashboard, /schedule, and the rest.
 *
 * It is the counterpart of `_site`, which wraps the marketing pages in the
 * header and the field; these pages get the rail and the top bar instead, and
 * the two shells never appear together. It is also where the session is
 * guarded, once, rather than in each page, and where the profile is fetched,
 * once, for the rail and the profile page to share.
 */
export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { status } = useSession();
  const navigate = useNavigate();

  /* Signing out from the top bar, or arriving without a session at all, goes
   * back to the landing page rather than sitting on an empty application. */
  useEffect(() => {
    if (status === "signed-out") void navigate({ to: "/", replace: true });
  }, [status, navigate]);

  return (
    <ProfileProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProfileProvider>
  );
}
