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
import TrashIcon from "@/shared/icons/TrashIcon";
import { CardLabel } from "../card-surface";
import { checkEmail } from "./email-schema";
import type { UserEmail } from "./email-api";

/*
 * The addresses on file, as three columns: the address, what is known about
 * it, and what can be done to it.
 *
 * **The radio is the primary address**, which is the one its owner signs in
 * with, and there is exactly one across the list -- which is why this is a
 * single `RadioGroup` over the whole table rather than a control per row. The
 * same arrangement `wallet/method-list.tsx` uses for the default payment
 * method, and for the same reason: choosing one is a save, so the group shows
 * what is, not what was clicked. The list is replaced by what the API returns,
 * and a refused change leaves the mark where it was.
 *
 * An unverified address cannot take the radio. Nobody has proved they read it,
 * and a login is not a thing to hand over on an unproven address; the database
 * refuses it too, so the disabled control is agreeing with the rule rather
 * than being the rule. The tooltip says why, because a disabled control that
 * does not explain itself reads as a bug.
 *
 * The last row is the one that adds an address: a field in the Email column,
 * nothing in Status because there is nothing known about it yet, and Add in
 * Action. It is a row rather than a dialog because it is one field, and a
 * dialog for one field is a door in front of a doorway.
 */

/* The column widths, in one place, because the head and every row have to
 * agree and three copies of a number is how they stop agreeing. Status and
 * Action are fixed and the address takes the rest. */
const COLUMNS = { status: "9.5rem", action: "7rem" };

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
              /* The last verified address cannot be given up: the primary is
               * refused outright, and taking the only other verified one away
               * would leave nothing that could ever become the login. */
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
        gridTemplateColumns: `1fr ${COLUMNS.status} ${COLUMNS.action}`,
        gap: 2,
        alignItems: "center",
        paddingBlock: 1,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
      }}
    >
      <CardLabel>Email</CardLabel>
      <CardLabel>Status</CardLabel>
      {/* The only right-aligned one, because the control under it is. */}
      <Box sx={{ textAlign: "right" }}>
        <CardLabel>Action</CardLabel>
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
  const radio = (
    <Radio
      value={address.UserEmailUUID}
      disabled={busy || !address.IsVerified}
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
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: `1fr ${COLUMNS.status} ${COLUMNS.action}`,
        },
        gap: { xs: 0.5, sm: 2 },
        alignItems: "center",
        paddingBlock: 1.5,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        opacity: busy ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", minWidth: 0 }}>
        {/* A disabled control takes no pointer events, so the tooltip goes on
         * a wrapper rather than on the radio itself. Without this the one
         * thing somebody needs to know -- why they cannot choose this row --
         * is the one thing they cannot reach. */}
        {address.IsVerified ? (
          radio
        ) : (
          <Tooltip title="Verify this address before you can sign in with it">
            <Box component="span" sx={{ display: "inline-flex" }}>
              {radio}
            </Box>
          </Tooltip>
        )}
        <Typography
          sx={{
            fontSize: "0.95rem",
            color: (theme) => theme.palette.brand.cardInk,
            overflowWrap: "anywhere",
          }}
        >
          {address.Email}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        sx={{
          gap: 0.75,
          flexWrap: "wrap",
          alignItems: "center",
          pl: { xs: 5.5, sm: 0 },
        }}
      >
        {address.IsVerified ? (
          <Tag>Verified</Tag>
        ) : (
          <Tag tone="fall">Unverified</Tag>
        )}
        {address.IsPrimary ? <Tag>Primary</Tag> : null}
      </Stack>

      <Stack
        direction="row"
        sx={{
          gap: 0.5,
          justifyContent: { xs: "flex-start", sm: "flex-end" },
          alignItems: "center",
          pl: { xs: 5.5, sm: 0 },
        }}
      >
        {/* Only where it can do something. An address already verified has
         * nothing to prove, and the API refuses a second link for one. */}
        {address.IsVerified ? null : (
          <Button
            type="button"
            variant="text"
            disabled={busy}
            onClick={onResend}
            sx={{
              fontFamily: "inherit",
              fontStyle: "normal",
              fontSize: "0.78rem",
              color: "primary.main",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Send link
          </Button>
        )}

        {/* The primary has no Delete, because removing it would leave an
         * account whose login resolves to no address. The API refuses it; the
         * button is absent rather than disabled, because there is nothing to
         * do about it here except choose another primary first. */}
        {address.IsPrimary ? (
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            Sign-in address
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
                <TrashIcon color="currentColor" size={16} />
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
        gridTemplateColumns: {
          xs: "1fr",
          sm: `1fr ${COLUMNS.status} ${COLUMNS.action}`,
        },
        gap: { xs: 1, sm: 2 },
        alignItems: "start",
        paddingBlock: 1.5,
      }}
    >
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

/* The pill in the Status column. Teal for what is settled, pink for what is
 * not, and the word is the whole message: nothing in this product is said in
 * color alone. */
function Tag({ children, tone }: { children: React.ReactNode; tone?: "fall" }) {
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
        /* Both sides come off the theme: a path like "primary.main" is only
         * resolved when sx is handed the string itself, not when a callback
         * returns one, and a callback is what a ternary needs. */
        color: (theme) =>
          tone === "fall"
            ? theme.palette.brand.fall
            : theme.palette.primary.main,
        backgroundColor: (theme) => theme.palette.brand.cardTint,
      }}
    >
      {children}
    </Typography>
  );
}
