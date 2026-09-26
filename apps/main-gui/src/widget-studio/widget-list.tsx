import Button from "@mui/material/Button";
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
 * copies it, and choosing a row is how somebody saves a new version over an
 * existing widget.
 */
export function WidgetList({
  widgets,
  loading,
  error,
  selectedId,
  onChoose,
}: {
  widgets: readonly WidgetSummary[];
  loading: boolean;
  error: string | null;
  selectedId: string;
  onChoose: (widget: WidgetSummary) => void;
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

          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {t("Version {{version}}", { version: widget.Version })}
          </Typography>

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
              onClick={() => onChoose(widget)}
              disabled={widget.WidgetId === selectedId}
            >
              {widget.WidgetId === selectedId ? t("Selected") : t("Save over")}
            </Button>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
