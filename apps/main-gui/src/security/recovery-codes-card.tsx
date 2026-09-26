import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { CardSurface } from "../card-surface";
import { useLanguage } from "../language";
import { occurredAt } from "./activity-time";
import type { RecoveryCodeStatus } from "./two-factor-api";

/*
 * RECOVERY CODES: how many are left, when they were made, and a button that
 * makes ten new ones.
 *
 * Its own card rather than a line on the two-factor card above it, because it
 * is a different kind of thing. That card is about what is asked for when you
 * login; this is about the day you cannot answer. They sit next to each other
 * because the second is what makes the first safe to turn on.
 *
 * **Codes are shown once, and the card never shows them again.** What it
 * holds afterwards is a count: the API stores hashes, so there is nothing to
 * show a second time and nothing anybody could ask support to read out. The
 * copy says so where somebody is deciding whether to write them down.
 *
 * The card knows nothing about the dialog. Pressing the button asks the page,
 * the page asks the API, and the codes come back up to the page, which is the
 * arrangement every other card here has -- see `security.tsx`.
 */

/* The count at which the card starts asking for a new set rather than waiting
 * to be asked. Three is late enough not to nag and early enough that somebody
 * still has codes in hand while they make the new ones. */
const LOW = 3;

export function RecoveryCodesCard({
  status,
  loading,
  busy,
  hasSecondFactor,
  onGenerate,
  sx,
}: {
  status: RecoveryCodeStatus;
  loading: boolean;
  busy: boolean;
  /* Whether anything is actually asking for a second factor at login. It
   * changes what the card says and nothing about what it does: codes can be
   * made at any time, and making them before turning a factor on is the
   * sensible order. */
  hasSecondFactor: boolean;
  onGenerate: () => void;
  sx?: SxProps<Theme>;
}) {
  const { language } = useLanguage();
  const made = status.GeneratedAt
    ? occurredAt(status.GeneratedAt, language.tag).day
    : "";

  return (
    <CardSurface title="Recovery Codes" sx={sx}>
      <Typography
        sx={{
          mb: 1.5,
          fontSize: "0.82rem",
          lineHeight: 1.7,
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        If you lose the phone with your authenticator app on it, a recovery code
        is the way back into your account. Each one works once, and using one
        turns two-factor authentication off so you can login with your password
        and set it up again. Keep them somewhere you can reach without your
        phone.
      </Typography>

      {loading ? (
        <Skeleton height={40} sx={{ transform: "none" }} />
      ) : (
        <>
          {/* Said before the count, because it is the thing to act on. An
           * account with a factor and no codes is one lost phone away from
           * being locked out for good. */}
          {hasSecondFactor && status.Remaining === 0 ? (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              You have no recovery codes. If you lose your authenticator app,
              nothing here can let you back in.
            </Alert>
          ) : null}
          {hasSecondFactor &&
          status.Remaining > 0 &&
          status.Remaining <= LOW ? (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
              You are down to {count(status.Remaining)}. Make a new set while
              you still have one in hand.
            </Alert>
          ) : null}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              gap: 1.5,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.9rem",
                color: (theme) => theme.palette.brand.cardInk,
              }}
            >
              {says(status, made)}
            </Typography>

            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={onGenerate}
              startIcon={
                busy ? (
                  <CircularProgress size={14} color="inherit" />
                ) : undefined
              }
              sx={{
                flexShrink: 0,
                fontFamily: "inherit",
                fontStyle: "normal",
              }}
            >
              {status.Total === 0 ? "Make recovery codes" : "Make a new set"}
            </Button>
          </Stack>
        </>
      )}
    </CardSurface>
  );
}

/*
 * The one line the card says about the state of the codes.
 *
 * An account that has never made a set is told what pressing the button will
 * do rather than being shown "0 of 0". A set that exists is counted and
 * dated, because "4 of 10" and "made in March" are the two things somebody
 * needs to decide whether to make new ones.
 */
function says(status: RecoveryCodeStatus, made: string): string {
  if (status.Total === 0) return "You have not made any recovery codes yet.";
  const left = `${count(status.Remaining)} of ${status.Total}`;
  return made ? `${left}, made on ${made}.` : `${left}.`;
}

/* "1 code left" or "4 codes left", written out rather than left as
 * "1 code(s)", which is a sentence nobody would write by hand. */
function count(remaining: number): string {
  return remaining === 1 ? "1 code left" : `${remaining} codes left`;
}
