import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { SignInPromptProvider } from "../authentication";
import { SiteHeader } from "./site-header";

/* The violet field and header every route is rendered inside. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <SignInPromptProvider>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          backgroundImage: (theme) => theme.palette.brand.field,
        }}
      >
        <SiteHeader />
        <Box
          component="main"
          sx={{ display: "flex", flex: 1, flexDirection: "column" }}
        >
          {children}
        </Box>
      </Box>
    </SignInPromptProvider>
  );
}
