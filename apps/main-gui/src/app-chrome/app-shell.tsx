import Box from "@mui/material/Box";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopBar } from "./app-top-bar";

/*
 * The shell every page behind the login is rendered inside: the rail, the top
 * bar, and the field the cards are laid on. It is the application's answer to
 * `site-chrome`, which is the marketing pages' -- the two never appear
 * together, which is why `routes/_site.tsx` wraps those and this wraps these.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        backgroundImage: (theme) => theme.palette.brand.field,
      }}
    >
      <AppSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      {/* minWidth keeps a wide card from pushing the column past the window
       * rather than scrolling inside itself. */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          flexDirection: "column",
        }}
      >
        <AppTopBar onOpenNav={() => setNavOpen(true)} />
        <Box
          component="main"
          sx={{
            flex: 1,
            padding: { xs: "1.1rem", sm: "1.4rem", md: "1.75rem" },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
