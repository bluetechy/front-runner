import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

/*
 * One card on the dashboard: white paper on the field, with the same dark
 * rule and the same 1.75rem corners the pricing cards have, because they are
 * the same surface and the app should only have one of them. Everything
 * inside is drawn in the card's own ink -- see `brand.card*` in the theme.
 *
 * The heading is the small uppercase label the mock-up puts over each card,
 * and `action` is whatever sits opposite it: a period picker, a link.
 */
export function DashboardCard({
  title,
  action,
  children,
  sx,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: { xs: "1.25rem", sm: "1.4rem 1.5rem" },
          borderRadius: "1.75rem",
          backgroundColor: (theme) => theme.palette.brand.card,
          border: (theme) => `2px solid ${theme.palette.brand.cardEdge}`,
          color: (theme) => theme.palette.brand.cardInk,
          boxShadow: "0 14px 34px rgba(10, 2, 24, 0.25)",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {title || action ? (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            marginBottom: 1.5,
          }}
        >
          {title ? <CardLabel>{title}</CardLabel> : <span />}
          {action}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}

/* The small uppercase label over a card, and over the sections inside one. */
export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="h2"
      sx={{
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}
