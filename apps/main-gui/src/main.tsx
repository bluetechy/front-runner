import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SessionProvider } from "./authentication";
import { theme } from "./design-system";
/* Imported for its side effect: this is what starts i18next, and it has to
 * have run before the first `useTranslation`. */
import "./language/i18n";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree, defaultPreload: "intent" });

/*
 * The cache every API hook in the app reads through. One client for the
 * process, made here rather than inside a component so it survives a re-render
 * and a route change.
 *
 * Only `notifications/` goes through it so far -- `profile/` and `wallet/`
 * still fetch in a `useEffect` of their own. The defaults are set here rather
 * than per query so the next vertical to move over does not have to rediscover
 * them: one retry, because a GraphQL error is usually a refused request rather
 * than a flaky wire and retrying it three times just makes the browser wait
 * longer to say so.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("index.html is missing the #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
