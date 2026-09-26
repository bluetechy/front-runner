import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { WidgetSummary } from "./widgets-api";

/*
 * The widgets on this account, and the id of each one.
 *
 * The id is the point of the table. It is random by design -- it is served to
 * pages carrying no token, so it has to be unguessable -- which means a widget
 * whose id has been lost can still be served forever and can never be found
 * again. So it is on the screen in full, in monospace, next to a button that
 * copies it.
 *
 * **Open** puts the widget's draft in the box, name and all. It replaced a
 * "save over" that took the id and left the definition alone, which was the
 * honest thing to offer before a definition could be read back: the page would
 * otherwise have been holding one document and writing over another.
 *
 * Each row says where the widget stands as two marks rather than one number,
 * because a widget being worked on is in two states at once: a draft nobody is
 * served, and a version everybody is.
 */
export function WidgetList({
  widgets,
  loading,
  error,
  selectedId,
  onOpen,
}: {
  widgets: readonly WidgetSummary[];
  loading: boolean;
  error: string | null;
  selectedId: string;
  onOpen: (widget: WidgetSummary) => void;
}) {
  const { t } = useTranslation();

  if (loading)
    return (
      <Stack sx={{ gap: 1 }}>
        <Skeleton variant="rounded" height={44} />
        <Skeleton variant="rounded" height={44} />
      </Stack>
    );

  if (error)
    return (
      <Typography sx={{ fontSize: "0.9rem", color: "error.main" }}>
        {error}
      </Typography>
    );

  if (!widgets.length)
    return (
      <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
        {t("Nothing saved yet. The first save mints an id.")}
      </Typography>
    );

  return (
    <Stack
      component="ul"
      sx={{ gap: 1, margin: 0, padding: 0, listStyle: "none" }}
    >
      {widgets.map((widget) => (
        <Stack
          component="li"
          key={widget.WidgetId}
          direction={{ xs: "column", sm: "row" }}
          sx={{
            gap: { xs: 0.5, sm: 1.5 },
            alignItems: { sm: "center" },
            padding: "0.7rem 0.9rem",
            borderRadius: 2,
            border: (theme) =>
              `1px solid ${
                widget.WidgetId === selectedId
                  ? theme.palette.primary.main
                  : theme.palette.brand.cardEdge
              }`,
          }}
        >
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.92rem", fontWeight: 600 }}>
              {widget.Name}
            </Typography>
            {/* In full, wrapping rather than truncated: an id with an ellipsis
             * in the middle of it is an id nobody can read out or check. */}
            <Typography
              sx={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: "0.78rem",
                wordBreak: "break-all",
                color: "text.secondary",
              }}
            >
              {widget.WidgetId}
            </Typography>
          </Stack>

          {/* Where it stands. Words rather than color alone, and the published
           * version named rather than implied, because "live" without a number
           * is what makes somebody publish a draft they meant to keep. */}
          <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }}>
            <Chip
              size="small"
              variant="outlined"
              label={t("Draft {{version}}", { version: widget.DraftVersion })}
            />
            {widget.PublishedVersion === null ? (
              <Chip size="small" label={t("Not published")} />
            ) : (
              <Chip
                size="small"
                color="success"
                label={t("Live {{version}}", {
                  version: widget.PublishedVersion,
                })}
              />
            )}
          </Stack>

          <Stack direction="row" sx={{ gap: 0.5 }}>
            {/* Best effort on purpose: the clipboard needs a permission and a
             * secure context, and a copy that quietly failed is not worth an
             * error on a page whose id is already legible on the screen. */}
            <Button
              size="small"
              variant="text"
              onClick={() => {
                void navigator.clipboard?.writeText?.(widget.WidgetId);
              }}
            >
              {t("Copy id")}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onOpen(widget)}
              disabled={widget.WidgetId === selectedId}
            >
              {widget.WidgetId === selectedId ? t("In the box") : t("Open")}
            </Button>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
