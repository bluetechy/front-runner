import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import LinkIcon from "@/shared/icons/LinkIcon";
import TrashIcon from "@/shared/icons/TrashIcon";
import { CardLabel } from "../card-surface";
import { checkEmail } from "./email-schema";
import type { UserEmail } from "./email-api";

/*
 * The addresses on file, as four columns: which one is the login, the address
 * itself, what is known about it, and what can be done to it.
 *
 * **The radio is the primary address**, which is the one its owner signs in
 * with, and it is the only thing that says so: the column it stands in is
 * headed Primary, and no row wears a pill saying the same word twice. There
 * is exactly one across the list, which is why this is a single `RadioGroup`
 * over the whole table rather than a control per row. The same arrangement
 * `wallet/method-list.tsx` uses for the default payment method, and for the
 * same reason: choosing one is a save, so the group shows what is, not what
 * was clicked. The list is replaced by what the API returns, and a refused
 * change leaves the mark where it was.
 *
 * An unverified address has no radio at all. Nobody has proved they read it,
 * and a login is not a thing to hand over on an unproven address; the database
 * refuses it too, so the missing control is agreeing with the rule rather than
 * being the rule. It is absent rather than disabled for the reason the primary
 * row has no Delete: there is nothing to do about it in this column, and the
 * row already says what it is in Status and offers the link that fixes it in
 * Action(s).
 *
 * The Action(s) column is glyphs rather than words. Every row that is not
 * verified offers the link again, and every row that is not the primary
 * offers Delete, which is every row but one: the login cannot be removed,
 * because an account whose login resolves to no address has no way back in.
 * That row shows a dash where the others show a bin, since there is nothing
 * for it to offer, and the radio beside it has already said why.
 *
 * The last row is the one that adds an address: a field in the Email column,
 * nothing in Primary or Status because there is nothing known about an
 * address that does not exist yet, and Add in Action(s). It is a row rather
 * than
 * a dialog because it is one field, and a dialog for one field is a door in
 * front of a doorway.
 */

/* The column widths, in one place, because the head and every row have to
 * agree and three copies of a number is how they stop agreeing. Primary,
 * Status and Action(s) are fixed and the address takes the rest. */
const COLUMNS = { primary: "5rem", status: "7.5rem", action: "8rem" };

/* Both row actions are a glyph and nothing else, so they are the same size or
 * one of them reads as the more important of the two. Sixteen was a hairline
 * at the end of a row somebody is scanning rather than reading. */
const ACTION_ICON = 22;

/* The head and every row draw the same four columns. Below `sm` they stack,
 * and the radio keeps a column of its own beside them rather than becoming a
 * line above the address: it belongs to the whole row. */
const TEMPLATE = {
  xs: "auto 1fr",
  sm: `${COLUMNS.primary} 1fr ${COLUMNS.status} ${COLUMNS.action}`,
};

export function EmailList({
  addresses,
  loading,
  busyId,
  adding,
  onChoosePrimary,
  onRemove,
  onResend,
  onAdd,
}: {
  addresses: UserEmail[];
  loading: boolean;
  /* The address with a save in flight, so its own row can say so without the
   * rest of the table going quiet. */
  busyId: string | null;
  adding: boolean;
  onChoosePrimary: (address: UserEmail) => void;
  onRemove: (address: UserEmail) => void;
  onResend: (address: UserEmail) => void;
  onAdd: (email: string) => void;
}) {
  const primary = addresses.find((address) => address.IsPrimary);

  return (
    <Box>
      <HeadRow />

      {loading ? (
        <Stack sx={{ gap: 1, paddingBlock: 1 }}>
          {[0, 1].map((row) => (
            <Skeleton key={row} height={56} sx={{ transform: "none" }} />
          ))}
        </Stack>
      ) : (
        <RadioGroup
          /* Empty string rather than undefined when nothing is set, so the
           * group stays controlled and React does not warn about it changing
           * from one to the other. */
          value={primary?.UserEmailUUID ?? ""}
          onChange={(event) => {
            const address = addresses.find(
              (candidate) => candidate.UserEmailUUID === event.target.value,
            );
            if (address) onChoosePrimary(address);
          }}
          sx={{ gap: 0 }}
        >
          {addresses.map((address) => (
            <EmailRow
              key={address.UserEmailUUID}
              address={address}
              busy={busyId === address.UserEmailUUID}
              onRemove={() => onRemove(address)}
              onResend={() => onResend(address)}
            />
          ))}
        </RadioGroup>
      )}

      <AddRow busy={adding} onAdd={onAdd} />
    </Box>
  );
}

/* The head. Presentational rather than a real `<table>`: every row here is a
 * form control and a label, and a grid keeps them reachable in source order
 * on a narrow screen where the columns stack. */
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
      {/* Centered over the radio under it, which is the only thing this
       * column holds. */}
      <Box sx={{ textAlign: "center" }}>
        <CardLabel>Primary</CardLabel>
      </Box>
      <CardLabel>Email</CardLabel>
      <CardLabel>Status</CardLabel>
      {/* The only right-aligned one, because the control under it is.
       * Action(s), because a row can offer two of them and a heading that
       * promised one would be counting wrong on most of the table. */}
      <Box sx={{ textAlign: "right" }}>
        <CardLabel>Action(s)</CardLabel>
      </Box>
    </Box>
  );
}

function EmailRow({
  address,
  busy,
  onRemove,
  onResend,
}: {
  address: UserEmail;
  busy: boolean;
  onRemove: () => void;
  onResend: () => void;
}) {
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: { sm: "center" },
          /* Stacked, the radio stands beside the whole row rather than above
           * the address: there is one of it per row, not one per line. */
          gridRow: { xs: "1 / 4", sm: "auto" },
        }}
      >
        {/* One per row, on every address somebody has proved they read, and
         * none at all on the rest: an address that cannot be the login is not
         * offered as one. */}
        {address.IsVerified ? (
          <Radio
            value={address.UserEmailUUID}
            disabled={busy}
            slotProps={{
              input: {
                "aria-label": `Sign in with ${address.Email}`,
              },
            }}
            sx={{
              color: (theme) => theme.palette.brand.cardInkMuted,
              "&.Mui-checked": { color: "primary.main" },
            }}
          />
        ) : null}
      </Box>

      <Typography
        sx={{
          minWidth: 0,
          fontSize: "0.95rem",
          color: (theme) => theme.palette.brand.cardInk,
          overflowWrap: "anywhere",
        }}
      >
        {address.Email}
      </Typography>

      <Stack
        direction="row"
        sx={{ gap: 0.75, flexWrap: "wrap", alignItems: "center" }}
      >
        {address.IsVerified ? (
          <Tag>Verified</Tag>
        ) : (
          <Tag tone="waiting">Unverified</Tag>
        )}
      </Stack>

      <Stack
        direction="row"
        sx={{
          gap: 0.5,
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          alignItems: "center",
        }}
      >
        {/* Only where it can do something. An address already verified has
         * nothing to prove, and the API refuses a second link for one. */}
        {address.IsVerified ? null : (
          <Tooltip title="Send link">
            <Box component="span" sx={{ display: "inline-flex" }}>
              <IconButton
                aria-label="Send link"
                disabled={busy}
                onClick={onResend}
                sx={{ color: "primary.main" }}
              >
                <LinkIcon color="currentColor" size={ACTION_ICON} />
              </IconButton>
            </Box>
          </Tooltip>
        )}

        {/* Delete on every row but the primary. Removing that one would leave
         * an account whose login resolves to no address, and the API refuses
         * it; the button is absent rather than disabled, because there is
         * nothing to do about it here except choose another primary first. A
         * dash stands where it would have been, so the column keeps its
         * shape, and it is hidden from a screen reader because a dash read
         * aloud is a word about nothing: the checked radio on the same row
         * has already said what this address is. */}
        {address.IsPrimary ? (
          <Typography
            aria-hidden
            sx={{
              /* As wide as the button it stands in for -- the glyph plus the
               * padding Material puts round it -- so the dash lands under the
               * bins above and below it rather than against the edge. */
              width: `${ACTION_ICON + 16}px`,
              textAlign: "center",
              fontSize: "0.95rem",
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            &mdash;
          </Typography>
        ) : (
          <Tooltip title={`Remove ${address.Email}`}>
            <Box component="span" sx={{ display: "inline-flex" }}>
              <IconButton
                aria-label={`Remove ${address.Email}`}
                disabled={busy}
                onClick={onRemove}
                sx={{ color: (theme) => theme.palette.brand.fall }}
              >
                <TrashIcon color="currentColor" size={ACTION_ICON} />
              </IconButton>
            </Box>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
}

/* The last row: the field that adds an address.
 *
 * It keeps its own text and its own error, because neither is anybody else's
 * business and lifting them would make the whole table re-render on every
 * keystroke. What it does not keep is whether the save is running -- that
 * belongs to the page, which is the thing that knows.
 */
function AddRow({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (email: string) => void;
}) {
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = () => {
    const failure = checkEmail(value);
    setProblem(failure);
    if (failure) return;
    onAdd(value);
    setValue("");
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: TEMPLATE.sm },
        gap: { xs: 1, sm: 2 },
        alignItems: "start",
        paddingBlock: 1.5,
      }}
    >
      {/* Nothing in Primary: an address cannot be the login before it is an
       * address, let alone a verified one. */}
      <Box aria-hidden sx={{ display: { xs: "none", sm: "block" } }} />

      <TextField
        type="email"
        size="small"
        fullWidth
        value={value}
        disabled={busy}
        onChange={(event) => {
          setValue(event.target.value);
          /* The message goes as soon as the field is touched again: leaving
           * it there while somebody fixes the typo is scolding them for
           * something they are already dealing with. */
          if (problem) setProblem(null);
        }}
        error={problem !== null}
        helperText={problem ?? "Add another address you read mail at"}
        placeholder="you@example.com"
        slotProps={{ htmlInput: { "aria-label": "Add an email address" } }}
        sx={{
          /* A text box is drawn against what is written in it. The theme's
           * own field is a hollow in the dark sign-in panel, which on card
           * paper is a white box on a white card with no edge to it -- which
           * is what this was, and it was hard to see that there was a box
           * here at all. So it takes the card's edge, the card's ink and the
           * square-ish corners every other field on this paper has. See
           * docs/style-guide.md. */
          "& .MuiOutlinedInput-root": {
            borderRadius: "0.7rem",
            backgroundColor: (theme) => theme.palette.brand.card,
            color: (theme) => theme.palette.brand.cardInk,
            "& fieldset": {
              borderColor: (theme) => theme.palette.brand.cardFieldEdge,
            },
            "&:hover fieldset": {
              borderColor: (theme) => theme.palette.brand.cardFieldEdgeHover,
            },
            "&.Mui-error fieldset": { borderColor: "error.main" },
          },
          /* The theme's placeholder is a violet for that dark hollow and is
           * 3.2:1 here; the card's own muted ink is 6.5:1. */
          "& .MuiInputBase-input::placeholder": {
            color: (theme) => theme.palette.brand.cardInkMuted,
            opacity: 1,
          },
          /* Material writes a helper line in `error.main`, which is 3.7:1 on
           * card paper. `brand.fall` is the red this app reads on white, at
           * 5.4:1. The outline keeps `error.main`: it is drawn rather than
           * written, so its floor is 3:1 and it clears that. */
          "& .MuiFormHelperText-root": {
            marginLeft: "0.15rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
            "&.Mui-error": { color: (theme) => theme.palette.brand.fall },
          },
        }}
      />

      {/* Nothing in Status: there is nothing known about an address that has
       * not been added yet, and a pill saying "Unverified" before it exists
       * would be describing something that is not there. */}
      <Box aria-hidden sx={{ display: { xs: "none", sm: "block" } }} />

      <Box sx={{ justifySelf: { xs: "start", sm: "end" } }}>
        <Button
          type="submit"
          variant="contained"
          disabled={busy}
          sx={{
            fontFamily: "inherit",
            fontStyle: "normal",
            color: "common.white",
            backgroundImage: (theme) => theme.palette.brand.buttonGradient,
          }}
        >
          Add
        </Button>
      </Box>
    </Box>
  );
}

/* The pill in the Status column: teal for what is settled, the accent's pink
 * for what is still waiting on somebody. The word is the whole message --
 * nothing in this product is said in color alone -- and both pairs come off
 * `brand.statusPills`, which is where the ratios behind them are written
 * down. */
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
