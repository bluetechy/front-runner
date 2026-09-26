import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PasskeyIcon from "@/shared/icons/PasskeyIcon";
import { useLanguage } from "../language";
import { occurredAt } from "./activity-time";
import type { Passkey } from "./passkey-api";

/*
 * The passkeys on the account, one to a row: the mark, what it was called
 * where it was registered, when that was, and the one thing that can be done
 * about it.
 *
 * The rule between rows, the muted second line and the right-aligned action
 * are the SSO and two-factor cards', above it on the page, because they are
 * three lists of credentials on one page and a fourth style would say they
 * were different kinds of thing. No head row, for the same reason those have
 * none.
 *
 * **In the API's order, which is newest first.** Unlike the SSO card, which
 * sorts alphabetically because it is a list to look a row up in, and unlike
 * the two-factor card, which is two fixed rows in the order the product
 * recommends them. This is a list somebody arrives at to find the key they
 * just added or the one on a laptop they no longer have, and both of those
 * are found by date. The order is the API's so that a second client could
 * not quietly disagree about it.
 *
 * Every row has the same mark, which is a departure from both those cards
 * and is honest rather than lazy: the provider is not told what made a
 * passkey, only that something did. A laptop, a phone and a plastic key on a
 * keyring come back here indistinguishable, and a guessed icon would be the
 * page inventing a fact about somebody's hardware.
 */

/* The mark a row is drawn at, the same size the two cards above draw theirs:
 * the subject of its row rather than an action on the end of one. */
const MARK = 26;

export function PasskeyList({
  passkeys,
  loading,
  failed,
  busyId,
  onRemove,
}: {
  passkeys: Passkey[];
  loading: boolean;
  /* Whether the read failed, which is the third thing an empty list can mean
   * and the one it must not report as the second. The message itself is the
   * card's, above this list, the same arrangement `sso-list.tsx` has. */
  failed: boolean;
  /* The row with something in flight, so its own row can say so without the
   * rest of the card going quiet. */
  busyId: string | null;
  onRemove: (passkey: Passkey) => void;
}) {
  if (loading)
    return (
      <Stack sx={{ gap: 1, paddingBlock: 1 }}>
        {[0, 1].map((row) => (
          <Skeleton key={row} height={56} sx={{ transform: "none" }} />
        ))}
      </Stack>
    );

  /* Nothing registered, which is the state most accounts are in and is not a
   * failure. Said in the sentence somebody can act on: the button that fixes
   * it is on the card's title line, above this. A card that could not be read
   * says so there instead, and never reaches here looking like this. */
  if (passkeys.length === 0 && !failed)
    return (
      <Typography
        sx={{
          paddingBlock: 3,
          textAlign: "center",
          fontSize: "0.9rem",
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        No passkeys yet. Add one and you can login with your face, your
        fingerprint or a security key instead of a password.
      </Typography>
    );

  return (
    <Box>
      {passkeys.map((passkey) => (
        <PasskeyRow
          key={passkey.Id}
          passkey={passkey}
          busy={busyId === passkey.Id}
          onRemove={() => onRemove(passkey)}
        />
      ))}
    </Box>
  );
}

function PasskeyRow({
  passkey,
  busy,
  onRemove,
}: {
  passkey: Passkey;
  busy: boolean;
  onRemove: () => void;
}) {
  const { language } = useLanguage();

  return (
    <Stack
      direction="row"
      sx={{
        gap: { xs: 1.25, sm: 2 },
        alignItems: "center",
        paddingBlock: 1.5,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        opacity: busy ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: "inline-flex",
          flex: "0 0 auto",
          width: MARK,
          color: (theme) => theme.palette.brand.cardInk,
        }}
      >
        <PasskeyIcon color="currentColor" size={MARK} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInk,
            overflowWrap: "anywhere",
          }}
        >
          {passkey.Label ?? "Unnamed passkey"}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {says(passkey, language.tag)}
        </Typography>
      </Box>

      <Box sx={{ flex: "0 0 auto" }}>
        <Button
          type="button"
          variant="outlined"
          size="small"
          disabled={busy}
          onClick={onRemove}
          startIcon={
            busy ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          sx={{ fontFamily: "inherit", fontStyle: "normal" }}
        >
          Remove
        </Button>
      </Box>
    </Stack>
  );
}

/*
 * The line under the name, which is the date and nothing else.
 *
 * A date is the whole of what this row can honestly add. Two passkeys named
 * the same thing are told apart by when they were made, and a key somebody
 * has forgotten registering is recognized, or not, by the day it happened.
 *
 * There is nothing here about where it was last used, and that is not an
 * omission to fix later: the provider does not record it, so a line claiming
 * it would be invented. The recent activity log at the foot of this page is
 * where "what has been getting into this account" is answered.
 */
function says(passkey: Passkey, language: string): string {
  if (!passkey.CreatedAt) return "Registered on this account.";
  return `Registered on ${occurredAt(passkey.CreatedAt, language).day}.`;
}
