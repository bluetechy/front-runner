import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { WidgetVersion } from "./widgets-api";

/*
 * A widget's history: what there is to go back to.
 *
 * This is where rollback lives, and it is deliberately not a button called
 * "roll back". Every row offers **Publish**, because publishing version 1 when
 * version 3 is live *is* the rollback: there is no separate operation, no
 * separate permission and nothing to learn. What makes that safe is the other
 * button, **Open**, which puts a version in the box so somebody can read what
 * they are about to put in front of customers before they do it.
 *
 * Two marks rather than one, because they come apart: the version being served
 * and the version last saved are the same row on a widget nobody is working on,
 * and different rows the moment somebody is.
 */
export function VersionList({
  versions,
  loading,
  error,
  openVersion,
  busyVersion,
  onOpen,
  onPublish,
}: {
  versions: readonly WidgetVersion[];
  loading: boolean;
  error: string | null;
  /* Which version is in the box, so the row it came from says so rather than
   * offering to open it again. */
  openVersion: number | null;
  /* Which row has a publish in flight. One at a time: publishing twice from two
   * rows would be two answers to what the world sees. */
  busyVersion: number | null;
  onOpen: (version: number) => void;
  onPublish: (version: number) => void;
}) {
  const { t } = useTranslation();

  if (loading)
    return (
      <Stack sx={{ gap: 1 }}>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={40} />
      </Stack>
    );

  if (error)
    return (
      <Typography sx={{ fontSize: "0.9rem", color: "error.main" }}>
        {error}
      </Typography>
    );

  if (!versions.length)
    return (
      <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
        {t("No versions yet. Saving writes the first one.")}
      </Typography>
    );

  return (
    <Stack
      component="ul"
      sx={{ gap: 1, margin: 0, padding: 0, listStyle: "none" }}
    >
      {versions.map((version) => (
        <Stack
          component="li"
          key={version.Version}
          direction={{ xs: "column", sm: "row" }}
          sx={{
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: { sm: "center" },
            padding: "0.6rem 0.9rem",
            borderRadius: 2,
            border: (theme) =>
              `1px solid ${
                version.Version === openVersion
                  ? theme.palette.primary.main
                  : theme.palette.brand.cardEdge
              }`,
          }}
        >
          <Typography
            sx={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, minWidth: 0 }}
          >
            {t("Version {{version}}", { version: version.Version })}
          </Typography>

          {/* The marks. Words rather than color alone, because nothing in this
           * product is said in color alone. */}
          <Stack direction="row" sx={{ gap: 0.5 }}>
            {version.IsPublished ? (
              <Chip size="small" color="success" label={t("Live")} />
            ) : null}
            {version.IsDraft ? (
              <Chip size="small" variant="outlined" label={t("Latest save")} />
            ) : null}
          </Stack>

          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {new Date(version.CreatedAt).toLocaleString()}
          </Typography>

          <Stack direction="row" sx={{ gap: 0.5 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => onOpen(version.Version)}
              disabled={version.Version === openVersion}
            >
              {version.Version === openVersion ? t("In the box") : t("Open")}
            </Button>
            {/* Publishing what is already live is not offered, because it would
             * do nothing and look like it had done something. */}
            <Button
              size="small"
              variant="outlined"
              onClick={() => onPublish(version.Version)}
              disabled={version.IsPublished || busyVersion !== null}
            >
              {busyVersion === version.Version ? t("Publishing") : t("Publish")}
            </Button>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
