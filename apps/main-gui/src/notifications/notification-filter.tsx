import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useTranslation } from "react-i18next";
import {
  FILTERS,
  type NotificationCounts,
  type NotificationFilter,
} from "./notifications-api";

/*
 * All, Read, Unread — the strip under the panel's heading, and the same one on
 * the page. The order is `FILTERS` in `notifications-api`, written once so the
 * two cannot drift apart.
 *
 * The filter is the API's, not the browser's: the list is paged, so filtering
 * what has already been fetched would give pages of a different size each time
 * and an empty panel whenever the first twelve happened to be all read.
 * Changing it changes the query key, so each of the three keeps its own pages
 * and its own scroll position in the cache.
 *
 * The theme's toggle is dressed for the violet field -- light violet ink, and
 * the accent gradient under the selected segment. On card paper that ink is
 * unreadable, so this takes the same shape the rail's selected item does: the
 * card's own hollow as the track, and the chosen segment in white paper with
 * the card's ink on it.
 */
export function NotificationFilters({
  filter,
  onChange,
  counts,
}: {
  filter: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
  /* The page shows a number beside each one; the panel, which is narrow and
   * already says the unread count in its heading, does not. */
  counts?: NotificationCounts;
}) {
  const { t } = useTranslation();

  /* Not translated through the values: the wire words are `All`, `Unread` and
   * `Read`, and what is shown is looked up here. */
  const label: Record<NotificationFilter, string> = {
    All: t("All"),
    Unread: t("Unread"),
    Read: t("Read"),
  };

  return (
    <ToggleButtonGroup
      size="small"
      value={filter}
      onChange={(_event, chosen: NotificationFilter | null) => {
        /* Null is the selected segment being clicked again. A filter always
         * has an answer, so that is a no-op rather than "none of them". */
        if (chosen) onChange(chosen);
      }}
      aria-label={t("Show")}
      sx={{
        width: "100%",
        padding: "0.25rem",
        backgroundColor: (theme) => theme.palette.brand.cardField,
        border: "none",
        borderRadius: 999,
        "& .MuiToggleButton-root": {
          flex: 1,
          padding: "0.3rem 0.5rem",
          fontSize: "0.78rem",
          fontStyle: "normal",
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: (theme) => theme.palette.brand.cardInkMuted,
          "&:hover": {
            color: (theme) => theme.palette.brand.cardInk,
            backgroundColor: "transparent",
          },
          "&.Mui-selected": {
            color: (theme) => theme.palette.brand.cardInk,
            backgroundColor: (theme) => theme.palette.brand.card,
            backgroundImage: "none",
            boxShadow: (theme) => `0 1px 2px ${theme.palette.brand.cardRule}`,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.brand.card,
              backgroundImage: "none",
            },
          },
        },
      }}
    >
      {FILTERS.map((offered) => (
        <ToggleButton
          key={offered}
          value={offered}
          /* The count is in the label as well, so a screen reader hears
           * "Unread, 6" rather than two separate things or only the word.
           * Joined here rather than through a translation key: both halves
           * are already translated -- one is looked up above and the other is
           * a number -- and a key made only of placeholders has nothing in it
           * to translate. */
          aria-label={
            counts ? `${label[offered]}, ${counts[offered]}` : label[offered]
          }
        >
          {label[offered]}
          {counts ? (
            <Box component="span" sx={{ marginLeft: "0.4rem", opacity: 0.7 }}>
              {counts[offered]}
            </Box>
          ) : null}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
