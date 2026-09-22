import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ProfileForm } from "./profile-form";
import { ProfileSummary } from "./profile-summary";

/*
 * The profile page, at /profile. Built from a supplied mock-up: who this is
 * down the left, and the same profile as a form down the right.
 *
 * Almost all of it is placeholder -- see `details.ts` for the left and the
 * seed in `profile-form.tsx` for the right. Where the page cannot do what it
 * appears to offer, it says so in as many words rather than accepting the
 * click quietly; that is what `notice` is.
 */
export function Profile() {
  const [notice, setNotice] = useState<string | null>(null);

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
          <ProfileSummary onNotice={setNotice} />
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ProfileForm onNotice={setNotice} />
        </Grid>
      </Grid>

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setNotice(null)}
          sx={{ borderRadius: 2 }}
        >
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
