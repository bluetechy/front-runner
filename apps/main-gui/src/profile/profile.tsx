import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { ProfileForm } from "./profile-form";
import { ProfileSummary } from "./profile-summary";

/*
 * The profile page, at /profile. Built from a supplied mock-up: who this is
 * down the left, and the same profile as a form down the right.
 *
 * The profile itself is real: read through `profile-api.tsx` when the page
 * opens, written back when the form is submitted. What is still placeholder
 * is the two blocks nothing counts -- see `details.ts`.
 *
 * `notice` is how the page says something back: that it saved, that a field
 * needs another look, or that the API refused. Nothing here fails quietly.
 */

type Tone = "success" | "info" | "error";
export function Profile() {
  const [notice, setNotice] = useState<{
    message: string;
    tone: Tone;
  } | null>(null);

  const notify = useCallback(
    (message: string, tone: Tone = "info") => setNotice({ message, tone }),
    [],
  );

  return (
    <>
      <Stack sx={{ marginBottom: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          Profile
        </Typography>
        <Stack
          direction="row"
          sx={{ gap: 0.75, mt: 0.5, fontSize: "0.82rem", alignItems: "center" }}
        >
          <Typography
            component={Link}
            to="/dashboard"
            sx={{
              fontSize: "inherit",
              color: "primary.light",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Dashboard
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            &rsaquo;
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            Profile
          </Typography>
        </Stack>
      </Stack>

      <Grid
        container
        spacing={{ xs: 2, md: 2.5 }}
        sx={{ alignItems: "flex-start" }}
      >
        <Grid size={{ xs: 12, lg: 4 }}>
          <ProfileSummary onNotice={notify} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ProfileForm onNotice={notify} />
        </Grid>
      </Grid>

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice?.tone ?? "info"}
          variant="filled"
          onClose={() => setNotice(null)}
          sx={{
            borderRadius: 2,
            /* Material's "info" is a blue this product does not own. The
             * other two keep their colours: green and red mean the same
             * thing everywhere, and saying so is the point. */
            ...(notice?.tone === "info"
              ? {
                  backgroundColor: (theme) => theme.palette.brand.panel,
                  border: (theme) =>
                    `1px solid ${theme.palette.brand.panelEdge}`,
                  color: "common.white",
                }
              : {}),
          }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </>
  );
}
