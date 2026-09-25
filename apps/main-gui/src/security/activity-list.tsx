import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import ArrowLeftIcon from "@/shared/icons/ArrowLeftIcon";
import ArrowRightIcon from "@/shared/icons/ArrowRightIcon";
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
 *
 * **Twenty rows at a time, and the box they sit in never changes height.** The
 * API hands over one window -- the last thirty days, which the sentence above
 * this table says out loud -- and the paging is done here, over a list this
 * component already holds. Nothing is fetched by turning a page, so the arrows
 * answer at once and there is no spinner to draw for them.
 *
 * The fixed height is the point of the box rather than a side effect of it. A
 * table that shrank to three rows on the last page would walk the pager up the
 * screen from under the finger pressing it, and a card that changed height
 * every time somebody paged would make the whole page jump. So the rows sit in
 * a box twenty rows tall, whatever is in it: one row, twenty, or none at all.
 * A page whose rows all carry a device and a place is taller than twenty
 * nominal rows and scrolls those last few pixels inside the box, which is the
 * cost of the height never moving.
 */

/* The column widths, in one place, because the head and every row have to
 * agree. When, Status and Action(s) are fixed and the activity takes the rest,
 * which is the arrangement `email-list.tsx` uses. */
const COLUMNS = { when: "8.5rem", status: "7.5rem", action: "8rem" };

/* The same size the bin and the link in the address table above are drawn at,
 * so the two Action(s) columns line up down the page. */
const ACTION_ICON = 22;

/* The arrows in the pager, drawn a size down from the action column: they move
 * the table rather than acting on anything in it. */
const PAGE_ICON = 18;

/* How many rows a page holds. Twenty is about a screen of a list somebody
 * scans rather than reads, and it is the browser's number alone: the API's is
 * the thirty days, and the two are deliberately not the same knob. */
const PAGE_SIZE = 20;

/* What one row stands at when it carries a sentence and nothing under it. The
 * box below is twenty of these, so this is the number that makes the table's
 * height fixed; a row with a device and a place under the sentence is taller,
 * and the box scrolls rather than growing. */
const ROW_HEIGHT = "4rem";

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
  /* Which page is being read. Held here rather than on the page above: it is
   * one list either way, and nothing outside this table has an opinion about
   * where somebody is in it. */
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  /* Clamped rather than reset, because answering a row replaces the whole list
   * and saying no makes it one row longer. Somebody on page three stays on
   * page three while page three still has rows in it, and is walked back one
   * when it does not, instead of being thrown to the top of the log for
   * having answered a question. */
  const current = Math.min(page, pages - 1);
  const shown = events.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <Box>
      <HeadRow />

      {/* Twenty rows tall whatever is in it: an empty log, one row, a full
       * page, or the skeletons. See the note at the top of this file for why
       * the height is the point rather than a side effect. */}
      <Box
        sx={{
          height: `calc(${PAGE_SIZE} * ${ROW_HEIGHT})`,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <Stack sx={{ gap: 1, paddingBlock: 1 }}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={56} sx={{ transform: "none" }} />
            ))}
          </Stack>
        ) : events.length === 0 && !failed ? (
          /* An empty log is a good state rather than a missing one, so it says
           * what it means rather than leaving the reader to wonder whether the
           * table is broken. It says **in the last 30 days** rather than
           * "yet", because that is all this table was handed: an account that
           * has been quiet for a month is not a new one, and telling somebody
           * nothing has ever happened to an account they have had for a year
           * would be the page's only lie. It is not said over a log that could
           * not be read at all: that table is empty for a reason the page has
           * already given above it. */
          <Typography
            sx={{
              paddingBlock: 3,
              textAlign: "center",
              fontSize: "0.9rem",
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            Nothing has happened to this account in the last 30 days.
          </Typography>
        ) : (
          shown.map((event) => (
            <ActivityRow
              key={event.SecurityEventUUID}
              event={event}
              busy={busyId === event.SecurityEventUUID}
              onOpen={() => onOpen(event)}
            />
          ))
        )}
      </Box>

      <Pager page={current} pages={pages} onChange={setPage} />
    </Box>
  );
}

/*
 * The way between the pages: where you are, and then the two arrows.
 *
 * **Always drawn, even over a log that fits on one page**, with both arrows
 * disabled. A pager that appeared when the twenty-first event was recorded
 * would move the card's foot on the day somebody least wants the page to move
 * under them, and the table above it is a fixed height for the same reason.
 *
 * **On the left margin**, which is the one thing here settled by something
 * other than taste. The cookie pill is fixed to the bottom right corner of the
 * window at `zIndex.drawer + 2` and cannot be covered up, because it is the
 * only way back into that choice; this card is the last one on the page, so a
 * pager in its right corner is under that pill exactly when somebody has
 * scrolled to the foot of the page to use it. The left margin is out of its
 * way, and it lines the pager up with the column of Whens above it.
 *
 * Left is newer and right is older, because the list is newest first: the
 * arrows walk down the log in the direction it is written. They say that in
 * words as well, since an arrow alone leaves somebody to work out which end of
 * the log it is pointing at.
 *
 * A disabled arrow stays where it is rather than being taken away. It is the
 * edge of the log, which is worth showing: an arrow that vanished at the last
 * page would read as a control that had broken. It goes quiet instead, in the
 * card's muted ink at less than full strength, so the one that still works is
 * the one the eye lands on.
 */
function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        gap: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.78rem",
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        {`Page ${page + 1} of ${pages}`}
      </Typography>

      <PageButton
        label="Newer activity"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ArrowLeftIcon color="currentColor" size={PAGE_ICON} />
      </PageButton>

      <PageButton
        label="Older activity"
        disabled={page + 1 >= pages}
        onClick={() => onChange(page + 1)}
      >
        <ArrowRightIcon color="currentColor" size={PAGE_ICON} />
      </PageButton>
    </Stack>
  );
}

/* One of the two arrows. The span is what lets the tooltip still answer over a
 * disabled button, which is the same wrapper the eye in the Action column
 * wears; the ink is the card's muted one at less than full strength, so a
 * quiet arrow reads as an edge of the log rather than as something broken. */
function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <Box component="span" sx={{ display: "inline-flex" }}>
        <IconButton
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          size="small"
          sx={{
            color: "primary.main",
            "&.Mui-disabled": {
              color: (theme) => theme.palette.brand.cardInkMuted,
              opacity: 0.45,
            },
          }}
        >
          {children}
        </IconButton>
      </Box>
    </Tooltip>
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
