import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BankIcon from "@/shared/icons/BankIcon";
import CreditCardIcon from "@/shared/icons/CreditCardIcon";
import TrashIcon from "@/shared/icons/TrashIcon";
import { CardLabel } from "../card-surface";
import type { PaymentMethod } from "./wallet-api";

/*
 * The saved methods, one row each.
 *
 * The supplied mock-up draws this as a stack of bordered boxes with the
 * billing address repeated in a second column of every one; this is the same
 * information in the app's own card, as rows separated by a rule, with the
 * address under the card it belongs to rather than beside it. At `md` and up
 * the address moves into its own column, which is what the mock-up was after.
 *
 * **The radio is the default payment method**, and there is exactly one across
 * both kinds -- which is why this is a single `RadioGroup` over the whole list
 * rather than a control per row. Choosing one is a save, so the group is what
 * is showing rather than what was clicked: the list is replaced by what the
 * API returns, and a refused change leaves the mark where it was.
 */

export function MethodList({
  methods,
  loading,
  busyId,
  onChooseDefault,
  onRemove,
}: {
  methods: PaymentMethod[];
  loading: boolean;
  /* The method with a save in flight, so its own row can say so without the
   * rest of the list going quiet. */
  busyId: string | null;
  onChooseDefault: (method: PaymentMethod) => void;
  onRemove: (method: PaymentMethod) => void;
}) {
  if (loading) {
    return (
      <Stack sx={{ gap: 1 }}>
        {[0, 1].map((row) => (
          <Skeleton key={row} height={92} sx={{ transform: "none" }} />
        ))}
      </Stack>
    );
  }

  if (methods.length === 0) {
    return (
      <Box sx={{ paddingBlock: 3, textAlign: "center" }}>
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          Nothing saved yet
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: "0.85rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          Add a card or a bank account with the buttons above. The first one you
          save becomes the default.
        </Typography>
      </Box>
    );
  }

  const chosen = methods.find((method) => method.IsDefault);

  return (
    <RadioGroup
      /* Empty string rather than undefined when nothing is set, so the group
       * stays a controlled one and React does not warn about it changing. */
      value={chosen?.PaymentMethodUUID ?? ""}
      onChange={(event) => {
        const method = methods.find(
          (candidate) => candidate.PaymentMethodUUID === event.target.value,
        );
        if (method) onChooseDefault(method);
      }}
      sx={{ gap: 0 }}
    >
      {methods.map((method, index) => (
        <MethodRow
          key={method.PaymentMethodUUID}
          method={method}
          first={index === 0}
          busy={busyId === method.PaymentMethodUUID}
          onRemove={() => onRemove(method)}
        />
      ))}
    </RadioGroup>
  );
}

function MethodRow({
  method,
  first,
  busy,
  onRemove,
}: {
  method: PaymentMethod;
  first: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  const card = method.Kind === "CreditCard";
  const address = addressOf(method);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      sx={{
        gap: { xs: 1.5, md: 3 },
        paddingBlock: 2,
        borderTop: (theme) =>
          first ? "none" : `1px solid ${theme.palette.brand.cardRule}`,
        opacity: busy ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <Stack
        direction="row"
        sx={{ flex: 1, gap: 1.5, alignItems: "flex-start", minWidth: 0 }}
      >
        <Radio
          value={method.PaymentMethodUUID}
          disabled={busy}
          slotProps={{
            input: { "aria-label": `Use ${describe(method)} by default` },
          }}
          sx={{
            mt: -0.5,
            color: (theme) => theme.palette.brand.cardInkMuted,
            "&.Mui-checked": { color: "primary.main" },
          }}
        />

        {/* The tinted disc an icon sits in, the same one the profile's contact
         * lines use. There is no brand artwork in this app, so a card is a
         * card glyph and the network is written out beside it. */}
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: "0.7rem",
            color: "primary.main",
            backgroundColor: (theme) => theme.palette.brand.cardTint,
          }}
        >
          {card ? (
            <CreditCardIcon color="currentColor" size={20} />
          ) : (
            <BankIcon color="currentColor" size={20} />
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: "baseline", flexWrap: "wrap" }}
          >
            <Typography
              sx={{
                fontSize: "0.95rem",
                fontWeight: 600,
                color: (theme) => theme.palette.brand.cardInk,
              }}
            >
              {card ? (method.Brand ?? "Card") : "Bank account"}
            </Typography>
            {/* Four digits is the whole of what is kept in the clear; the rest
             * is encrypted and never comes back from the API. */}
            <Typography
              sx={{
                fontSize: "0.95rem",
                letterSpacing: "0.08em",
                color: (theme) => theme.palette.brand.cardInkMuted,
              }}
            >
              ••••&nbsp;{method.Last4}
            </Typography>
            {method.IsDefault ? <Tag>Default</Tag> : null}
            {method.IsExpired ? <Tag tone="fall">Expired</Tag> : null}
          </Stack>

          <Muted>{method.NameOnMethod || "No name given"}</Muted>
          <Muted>
            {card
              ? `Expires ${expiryOf(method)}`
              : `${method.AccountType} · routing ${method.RoutingNumber}`}
          </Muted>

          <Button
            type="button"
            variant="text"
            disabled={busy}
            onClick={onRemove}
            startIcon={<TrashIcon color="currentColor" size={16} />}
            sx={{
              mt: 0.75,
              fontFamily: "inherit",
              fontStyle: "normal",
              fontSize: "0.82rem",
              color: (theme) => theme.palette.brand.fall,
              "&:hover": {
                color: (theme) => theme.palette.brand.fall,
                textDecoration: "underline",
              },
            }}
          >
            Remove
          </Button>
        </Box>
      </Stack>

      {/* Cards only: a bank account has no billing address, and an empty
       * column headed "Billing address" would read as one that was lost. */}
      {card ? (
        <Box sx={{ width: { md: "16rem" }, flexShrink: 0 }}>
          <CardLabel>Billing address</CardLabel>
          <Box sx={{ mt: 0.75 }}>
            {address.length === 0 ? (
              <Muted>None given</Muted>
            ) : (
              address.map((line) => <Muted key={line}>{line}</Muted>)
            )}
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}

/* The small pill beside a method's name: which one pays, and which one has
 * stopped working. */
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

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: "0.82rem",
        lineHeight: 1.7,
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}

/* Back to the MM/YYYY a card is read in. The API sends the month and the year
 * apart, because a card expires at the end of a month and there is no day. */
function expiryOf(method: PaymentMethod): string {
  if (method.ExpirationMonth === null || method.ExpirationYear === null)
    return "—";
  return `${String(method.ExpirationMonth).padStart(2, "0")}/${method.ExpirationYear}`;
}

/* The lines of a billing address that were actually given. A state is optional
 * -- plenty of addresses have none -- so the empties are dropped rather than
 * left as blank lines. */
function addressOf(method: PaymentMethod): string[] {
  return [
    method.BillingLine1,
    [method.BillingCity, method.BillingState].filter(Boolean).join(", "),
    method.BillingPostalCode,
    method.BillingCountry,
  ]
    .map((line) => (line ?? "").trim())
    .filter((line) => line !== "");
}

/* What a screen reader hears on the radio, since the row's meaning is spread
 * over several lines beside it. */
function describe(method: PaymentMethod): string {
  return method.Kind === "CreditCard"
    ? `the ${method.Brand ?? "card"} ending ${method.Last4}`
    : `the bank account ending ${method.Last4}`;
}
