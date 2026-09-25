import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EyeIcon from "@/shared/icons/EyeIcon";
import { CardLabel } from "../card-surface";
import { useLanguage } from "../language";
import type { SecurityEvent } from "./activity-api";
import { statusOf } from "./activity-kinds";
import { occurredAt } from "./activity-time";

/*
 * What has happened to the account, as four columns: when it happened, what it
 * was, whether it has been answered, and the way in to answering it.
 *
 * The same table the addresses above it are drawn in -- a grid rather than a
 * `<table>`, the same rule between rows, the same right-aligned Action(s)
 * column, the same pills in Status -- because they are two lists on one page
 * and a second table style would say they were two different kinds of thing.
 *
 * The supplied mock-up groups rows under a heading per day and gives each row a
 * chevron. The grouping is what the When column does here instead: a date
 * heading buys a day's rows one shared line, which is worth it in a list with
 * one thing on each row and not worth it in a table whose first column is
 * already the date.
 *
 * The control the chevron stood for stays, because unlike the notification
 * row's it has somewhere to go, but it is drawn as an **eye**. A chevron says
 * there is more this way, which is what it says in the rail and in every
 * accordion; what this one does is show you a row you are already looking at,
 * in a dialog that opens over the page and closes back onto it. An eye says
 * that, and it says the same thing as the word in the tooltip and the label
 * under it, which a right arrow did not.
 *
 * **Every row opens the dialog**, including ones that have already been
 * answered. An answer can be changed, and somebody who pressed the wrong one is
 * exactly who needs the way back in; the Status column says which rows are
 * still asking.
 */

/* The column widths, in one place, because the head and every row have to
 * agree. When, Status and Action(s) are fixed and the activity takes the rest,
 * which is the arrangement `email-list.tsx` uses. */
const COLUMNS = { when: "8.5rem", status: "7.5rem", action: "8rem" };

/* The same size the bin and the link in the address table above are drawn at,
 * so the two Action(s) columns line up down the page. */
const ACTION_ICON = 22;

const TEMPLATE = {
  xs: "1fr",
  sm: `${COLUMNS.when} 1fr ${COLUMNS.status} ${COLUMNS.action}`,
};

export function ActivityList({
  events,
  loading,
  failed,
  busyId,
  onOpen,
}: {
  events: SecurityEvent[];
  loading: boolean;
  /* Whether the read failed, which is the third thing an empty table can mean
   * and the one it must not report as the second. The message itself is the
   * page's, above this table. */
  failed: boolean;
  /* The event with an answer in flight, so its own row can say so without the
   * rest of the table going quiet. */
  busyId: string | null;
  onOpen: (event: SecurityEvent) => void;
}) {
  return (
    <Box>
      <HeadRow />

      {loading ? (
        <Stack sx={{ gap: 1, paddingBlock: 1 }}>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} height={56} sx={{ transform: "none" }} />
          ))}
        </Stack>
      ) : events.length === 0 && !failed ? (
        /* An empty log is a good state rather than a missing one, so it says
         * what it means rather than leaving the reader to wonder whether the
         * table is broken. It is the sentence a brand new account sees, and it
         * is not said over a log that could not be read at all: that table is
         * empty for a reason the page has already given above it. */
        <Typography
          sx={{
            paddingBlock: 3,
            textAlign: "center",
            fontSize: "0.9rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          Nothing has happened to this account yet.
        </Typography>
      ) : (
        events.map((event) => (
          <ActivityRow
            key={event.SecurityEventUUID}
            event={event}
            busy={busyId === event.SecurityEventUUID}
            onOpen={() => onOpen(event)}
          />
        ))
      )}
    </Box>
  );
}

/* The head. Presentational rather than a real `<table>`, the way the address
 * table above it is: a grid keeps the columns in source order on a narrow
 * screen where they stack. */
function HeadRow() {
  return (
    <Box
      sx={{
        display: { xs: "none", sm: "grid" },
        gridTemplateColumns: TEMPLATE.sm,
        gap: 2,
        alignItems: "center",
        paddingBlock: 1,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
      }}
    >
      <CardLabel>When</CardLabel>
      <CardLabel>Activity</CardLabel>
      <CardLabel>Status</CardLabel>
      {/* Right-aligned, because the control under it is. Singular here and
       * plural over the addresses, because a row in this table offers exactly
       * one thing and a heading promising more would be counting wrong on all
       * of it. */}
      <Box sx={{ textAlign: "right" }}>
        <CardLabel>Action</CardLabel>
      </Box>
    </Box>
  );
}

function ActivityRow({
  event,
  busy,
  onOpen,
}: {
  event: SecurityEvent;
  busy: boolean;
  onOpen: () => void;
}) {
  const { language } = useLanguage();
  const when = occurredAt(event.OccurredAt, language.tag);
  const status = statusOf(event);
  /* The device and the place, on one muted line under the sentence. The
   * mock-up gives them a column of their own; most rows here know neither, and
   * a column that is empty on four rows out of five is a column of nothing. */
  const where = [event.Device, event.Location].filter(Boolean).join(" · ");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: TEMPLATE,
        gap: { xs: 0.5, sm: 2 },
        alignItems: "center",
        paddingBlock: 1.5,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        opacity: busy ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      {/* The day and the hour, one above the other, so a column of dates reads
       * down the page and the times stay out of the way until somebody is
       * reading one row. */}
      <Box>
        <Typography
          sx={{
            fontSize: "0.88rem",
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {when.day}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {when.time}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.95rem",
            color: (theme) => theme.palette.brand.cardInk,
            overflowWrap: "anywhere",
          }}
        >
          {event.Description}
        </Typography>
        {where ? (
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: (theme) => theme.palette.brand.cardInkMuted,
              overflowWrap: "anywhere",
            }}
          >
            {where}
          </Typography>
        ) : null}
      </Box>

      <Stack
        direction="row"
        sx={{ gap: 0.75, flexWrap: "wrap", alignItems: "center" }}
      >
        <Tag tone={status.tone}>{status.label}</Tag>
      </Stack>

      <Stack
        direction="row"
        sx={{
          gap: 0.5,
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          alignItems: "center",
        }}
      >
        {/* The row's name is in the label rather than the word "View" alone:
         * a screen reader running down this column would otherwise hear
         * "View, View, View" and have to go back for which is which. */}
        <Tooltip title="View">
          <Box component="span" sx={{ display: "inline-flex" }}>
            <IconButton
              aria-label={`View ${event.Description}`}
              disabled={busy}
              onClick={onOpen}
              sx={{ color: "primary.main" }}
            >
              <EyeIcon color="currentColor" size={ACTION_ICON} />
            </IconButton>
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
}

/* The pill in the Status column, and the same one the address table above
 * wears: teal for what is settled, the accent's pink for what is still waiting
 * on somebody. Both pairs come off `brand.statusPills`, which is where the
 * ratios behind them are written down, and the word is the whole message --
 * nothing in this product is said in color alone. */
function Tag({
  children,
  tone = "settled",
}: {
  children: React.ReactNode;
  tone?: "settled" | "waiting";
}) {
  return (
    <Typography
      component="span"
      sx={{
        paddingInline: 0.9,
        paddingBlock: 0.15,
        borderRadius: 999,
        fontSize: "0.7rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: (theme) => theme.palette.brand.statusPills[tone].ink,
        backgroundColor: (theme) => theme.palette.brand.statusPills[tone].tint,
      }}
    >
      {children}
    </Typography>
  );
}
