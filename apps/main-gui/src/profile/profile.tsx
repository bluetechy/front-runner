import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toast, type Notice, type ToastTone } from "../toast";
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
 * needs another look, or that the API refused. It is thrown as a toast into
 * the bottom right corner -- teal when the profile was written, pink when it
 * was not -- and it is only ever thrown once the API has answered, so the
 * page never says "saved" about a save still in flight. Nothing here fails
 * quietly.
 *
 * This is the first page inside the chrome to be translated -- the heading,
 * the breadcrumb, every label on the form, and the card down the left switch
 * with the flag in the top bar. What does not switch is what a field is
 * *worth*: a gender is stored as "Male" whatever the label above it says,
 * and a validation message is the API's words. See docs/language.md.
 */

export function Profile() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<Notice | null>(null);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => setNotice({ message, tone }),
    [],
  );

  return (
    <>
      <Stack sx={{ marginBottom: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          {t("Profile")}
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
            {t("Dashboard")}
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
            {t("Profile")}
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

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
