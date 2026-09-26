import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../language";
import { occurredAt } from "./activity-time";
import type { TwoFactorMethod } from "./two-factor-api";
import { kindOf } from "./two-factor-kinds";

/*
 * The second factors this product offers, one to a row: the mark, what it is
 * called, where this account stands with it, and the one thing that can be
 * done about it.
 *
 * The rule between rows, the muted second line, the pills and the
 * right-aligned action are the SSO card's, immediately above it on the page,
 * because they are two lists of credentials on one page and a second style
 * would say they were different kinds of thing. No head row, for the same
 * reason that one has none.
 *
 * **In the API's order, not sorted.** The SSO card sorts alphabetically
 * because it is a list to look a row up in, and an account may have any
 * number of providers connected. This is two rows, in the order the product
 * recommends them: the authenticator app first because it is the one to
 * choose, and SMS under it because the only reason to read that row is to
 * find out why not. Sorting it alphabetically would put SMS first and quietly
 * recommend it.
 *
 * A kind this installation cannot use is still a row, and says so. It is the
 * same honesty the SSO card shows a switched-off provider with: "we do not do
 * SMS" and "SMS is not switched on here" are the same row to somebody reading
 * the page and a different thing to whoever has to fix it.
 */

/* The mark a kind is drawn at, the same size the SSO card draws a provider's:
 * the subject of its row rather than an action on the end of one. */
const MARK = 26;

export function TwoFactorList({
  methods,
  loading,
  failed,
  busyKind,
  canEnable,
  onEnable,
  onDisable,
}: {
  methods: TwoFactorMethod[];
  loading: boolean;
  /* Whether the read failed, which is the third thing an empty list can mean
   * and the one it must not report as the second. The message itself is the
   * card's, above this list, the same arrangement `sso-list.tsx` has. */
  failed: boolean;
  /* The kind with something in flight, so its own row can say so without the
   * rest of the card going quiet. */
  busyKind: string | null;
  /* Whether this deployment can hand the browser to the provider to set one
   * up at all. False turns Enable into nothing rather than into a button that
   * goes nowhere -- see `second-factor-setup.ts`. */
  canEnable: (kind: string) => boolean;
  onEnable: (method: TwoFactorMethod) => void;
  onDisable: (method: TwoFactorMethod) => void;
}) {
  if (loading)
    return (
      <Stack sx={{ gap: 1, paddingBlock: 1 }}>
        {[0, 1].map((row) => (
          <Skeleton key={row} height={56} sx={{ transform: "none" }} />
        ))}
      </Stack>
    );

  /* Nothing to draw and no failure to explain it. This should not happen --
   * the API answers both rows whatever the account has -- so it says the true
   * thing rather than pretending the account is unprotected. */
  if (methods.length === 0 && !failed)
    return (
      <Typography
        sx={{
          paddingBlock: 3,
          textAlign: "center",
          fontSize: "0.9rem",
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        This site does not offer a second factor yet.
      </Typography>
    );

  return (
    <Box>
      {methods.map((method) => (
        <MethodRow
          key={method.Kind}
          method={method}
          busy={busyKind === method.Kind}
          canEnable={canEnable(method.Kind)}
          onEnable={() => onEnable(method)}
          onDisable={() => onDisable(method)}
        />
      ))}
    </Box>
  );
}

function MethodRow({
  method,
  busy,
  canEnable,
  onEnable,
  onDisable,
}: {
  method: TwoFactorMethod;
  busy: boolean;
  canEnable: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const { Icon } = kindOf(method.Kind);
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
        <Icon color="currentColor" size={MARK} />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          sx={{ gap: 0.75, alignItems: "center", flexWrap: "wrap" }}
        >
          <Typography
            sx={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: (theme) => theme.palette.brand.cardInk,
            }}
          >
            {method.Name}
          </Typography>
          {method.Configured ? <Tag>Configured</Tag> : null}
          {/* Said on the row rather than only in the paragraph above it,
           * because the row is where somebody chooses. The word is the whole
           * message: nothing in this product is said in color alone. */}
          {method.Recommended ? null : <Tag tone="waiting">Less secure</Tag>}
        </Stack>
        <Typography
          sx={{
            fontSize: "0.78rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
            overflowWrap: "anywhere",
          }}
        >
          {says(method, language.tag)}
        </Typography>
      </Box>

      <Box sx={{ flex: "0 0 auto" }}>{action()}</Box>
    </Stack>
  );

  /* One button, or none. A row this installation cannot offer shows nothing
   * rather than a disabled button, and the line above it says why instead: a
   * control that refuses when it is pressed makes somebody ask the question
   * twice to get an answer the row could have given first. The SSO card's
   * rule, applied to the same problem. */
  function action() {
    if (method.Configured)
      return (
        <Button
          type="button"
          variant="outlined"
          size="small"
          disabled={busy}
          onClick={onDisable}
          startIcon={
            busy ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          sx={{ fontFamily: "inherit", fontStyle: "normal" }}
        >
          Turn off
        </Button>
      );
    if (!method.Available || !canEnable) return null;
    return (
      <Button
        type="button"
        variant="outlined"
        size="small"
        disabled={busy}
        onClick={onEnable}
        startIcon={
          busy ? <CircularProgress size={14} color="inherit" /> : undefined
        }
        sx={{ fontFamily: "inherit", fontStyle: "normal" }}
      >
        Turn on
      </Button>
    );
  }
}

/*
 * The line under the name, which is the state of the row in one sentence.
 *
 * A configured row says when it was set up and what it was called there,
 * because somebody with two authenticator apps needs to know which row is
 * which, and because a date is what tells them whether this is the phone they
 * still have.
 *
 * The SMS row says the thing the mock-up says and means it: messages can be
 * read by somebody else on the way, a number can be taken over, and delivery
 * is nobody's promise. It is the one row on this page that argues with the
 * reader, and it argues because the alternative is one tap away above it.
 */
function says(method: TwoFactorMethod, language: string): string {
  if (method.Configured) {
    const named = method.Label
      ? `Set up as ${method.Label}`
      : "Set up on this account";
    const when = method.ConfiguredAt
      ? occurredAt(method.ConfiguredAt, language).day
      : "";
    return when ? `${named}, on ${when}.` : `${named}.`;
  }

  if (method.Kind === "sms")
    return method.Available
      ? "We advise against SMS: messages can be intercepted, a phone number can be taken over, and delivery is never certain. Use an authenticator app instead where you can."
      : "Not switched on here yet. We advise against SMS anyway: messages can be intercepted, a phone number can be taken over, and delivery is never certain.";

  if (!method.Available) return `${method.Name} is not switched on here yet.`;
  return "Use an authentication app or browser extension to get a code to type in when you login.";
}

/* The pill, which is the activity list's own: teal for what is settled, the
 * accent's pink for what wants reading twice. Both come off
 * `brand.statusPills`, where the ratios behind them are written down. */
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
