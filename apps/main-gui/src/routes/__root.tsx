import { Outlet, createRootRoute } from "@tanstack/react-router";

/*
 * Nothing but the outlet. There are two shells under it and they never appear
 * together: `_site` wraps the marketing pages in `site-chrome`, and
 * `/dashboard` wraps the application in `app-chrome`.
 */
export const Route = createRootRoute({ component: Outlet });
