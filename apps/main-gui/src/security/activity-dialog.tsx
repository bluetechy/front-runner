import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@/shared/icons/CheckCircleIcon";
import CloseIcon from "@/shared/icons/CloseIcon";
import LocationIcon from "@/shared/icons/LocationIcon";
import MobileIcon from "@/shared/icons/MobileIcon";
import { useId } from "react";
import { useLanguage } from "../language";
import type { SecurityEvent } from "./activity-api";
import { kindOf, statusOf } from "./activity-kinds";
import { occurredAt } from "./activity-time";

/*
 * One thing that happened to the account, opened from the table, and the
 * question the page exists to ask about it.
 *
 * From the supplied mock-up, which is Google's: when it happened and whether it
 * is new, what it was, what it would mean if it was not you, the device and the
 * place, and then the two answers. What is taken from it is that layout; what is
 * not, as ever, is the color. A dialog in this product is the violet panel the
 * theme already draws, the same one the wallet's dialogs and the login sit on.
 *
 * **Neither answer is painted.** They are the same outlined button twice, which
 * is the rule the cookie notice made and the only other place in this product
 * where what a button is painted is settled by something other than taste: a
 * contained button on one of two answers is a nudge, and the nudge here would
 * land on somebody deciding whether their account has been broken into. The
 * glyphs tell them apart and the words say the rest.
 *
 * It stays open while the answer is in flight and closes when the answer is
 * recorded, because what happens next is a sentence the page says -- a toast,
 * the way every other write on this page reports itself.
 */

export function ActivityDialog({
  event,
  pending,
  onClose,
  onAnswer,
}: {
  /* The event being looked at, or null when the dialog is shut. It stays
   * mounted through its own closing transition, so the last event is held by
   * the caller until the transition is over rather than being torn out from
   * under it. */
  event: SecurityEvent | null;
  /* The answer in flight, or null when there is none. It is the answer rather
   * than a boolean so that only the button somebody pressed reports itself:
   * two buttons spinning at once says the dialog did not hear which one. */
  pending: boolean | null;
  onClose: () => void;
  onAnswer: (event: SecurityEvent, recognized: boolean) => void;
}) {
  const titleId = useId();
  const { language } = useLanguage();
  const busy = pending !== null;

  const when = event ? occurredAt(event.OccurredAt, language.tag) : null;
  const kind = event ? kindOf(event.EventType) : null;
  const status = event ? statusOf(event) : null;

  return (
    <Dialog
      open={event !== null}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      maxWidth="xs"
      fullWidth
    >
      <Box
        sx={{
          position: "relative",
          p: { xs: "1.75rem 1.5rem", sm: "2rem 2.25rem" },
        }}
      >
        {/* Escape and the backdrop already close this; the button is the same
         * exit for anyone who reaches for neither. Held back while an answer
         * is in flight, like everything else here. */}
        <IconButton
          aria-label="Close"
          onClick={onClose}
          disabled={busy}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <CloseIcon color="currentColor" size={20} />
        </IconButton>

        {event && when && kind && status ? (
          <>
            {/* The date and the state on one line above the heading, which is
             * where the mock-up puts them: the first thing asked about a
             * login is when it was. */}
            <Stack
              direction="row"
              sx={{ gap: 1, alignItems: "center", flexWrap: "wrap", pr: 4 }}
            >
              <Typography
                variant="body2"
                sx={{ color: "text.secondary" }}
              >{`${when.day}, ${when.time}`}</Typography>
              <Tag settled={status.tone === "settled"}>{status.label}</Tag>
            </Stack>

            <Typography
              id={titleId}
              variant="h2"
              sx={{
                mt: 0.75,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "primary.light",
              }}
            >
              {kind.heading}
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 0.75, color: "text.secondary", lineHeight: 1.6 }}
            >
              {event.Description}
            </Typography>

            {/* Only on the events where being wrong about the answer is
             * expensive. A sentence about risk on every row would be a sentence
             * nobody reads by the third one. */}
            {kind.warning ? (
              <Typography
                variant="body2"
                sx={{ mt: 0.5, color: "text.secondary", lineHeight: 1.6 }}
              >
                {kind.warning}
              </Typography>
            ) : null}

            {/* What is known about where it came from, and nothing where
             * nothing is known: a row reading "Device: unknown" is a line of
             * text that answers nothing. */}
            {event.Device || event.Location ? (
              <Stack sx={{ mt: 2.5, gap: 1 }}>
                {event.Device ? (
                  <Fact icon={<MobileIcon color="currentColor" size={18} />}>
                    {event.Device}
                  </Fact>
                ) : null}
                {event.Location ? (
                  <Fact icon={<LocationIcon color="currentColor" size={18} />}>
                    {event.Location}
                  </Fact>
                ) : null}
              </Stack>
            ) : null}

            <Typography sx={{ mt: 3, fontWeight: 600 }}>
              Do you recognize this activity?
            </Typography>

            {/* An answer can be changed, so the question is asked again of an
             * event that already has one. Somebody who pressed the wrong
             * button is exactly who is opening this a second time. */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ mt: 1.5, gap: 1.5 }}
            >
              <Button
                variant="outlined"
                fullWidth
                disabled={busy}
                onClick={() => onAnswer(event, false)}
                startIcon={
                  pending === false ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CloseIcon color="currentColor" size={18} />
                  )
                }
              >
                No, secure account
              </Button>
              <Button
                variant="outlined"
                fullWidth
                disabled={busy}
                onClick={() => onAnswer(event, true)}
                startIcon={
                  pending === true ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CheckCircleIcon color="currentColor" size={18} />
                  )
                }
              >
                Yes, it was me
              </Button>
            </Stack>

            {/* Said before the button is pressed rather than after, because it
             * is what the button does: a person choosing "No" is owed the
             * knowledge that a message is about to arrive and that the account
             * is not locked by pressing it. */}
            <Typography
              variant="body2"
              sx={{ mt: 1.5, color: "text.secondary", lineHeight: 1.6 }}
            >
              Securing the account sends you a link to choose a new password.
              Your other email addresses and settings are left alone.
            </Typography>
          </>
        ) : null}
      </Box>
    </Dialog>
  );
}

/* One line of what is known: a glyph and a word. The glyph is decorative --
 * the word beside it is the fact -- so it is hidden rather than read out as
 * "mobile, Mac OS". */
function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
      <Box aria-hidden sx={{ display: "inline-flex", color: "text.secondary" }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: "0.95rem" }}>{children}</Typography>
    </Stack>
  );
}

/* The same word the Status column shows, on the panel rather than on card
 * paper: the card's pill tints are mixed for white and are invisible here, so
 * this one is drawn in the panel's own palette. The word is the message either
 * way. */
function Tag({
  settled,
  children,
}: {
  settled: boolean;
  children: React.ReactNode;
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
        color: "common.white",
        backgroundColor: (theme) =>
          settled
            ? theme.palette.brand.toastSuccess
            : theme.palette.primary.main,
      }}
    >
      {children}
    </Typography>
  );
}
