import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useLanguage } from "../language";
import type { SignInMethod } from "./sso-api";
import { kindOf } from "./sso-kinds";

/*
 * The providers this site can log somebody in from, one to a row: the
 * provider's own mark, what it is called, where this account stands with it,
 * and the one thing that can be done about it.
 *
 * **No head row**, which is the one place this list departs from the two
 * tables above it on the page. Those have four columns each and have to name
 * them; this has a name and a button, and a heading over a column of buttons
 * saying "Action" would be labeling the obvious.
 *
 * The rule between rows, the muted second line and the right-aligned action
 * are the tables' own, because they are three lists on one page and a fourth
 * style would say this was a different kind of thing.
 *
 * A provider that is switched off at the realm is still a row. It says so, and
 * it offers nothing: an account that connected Google before Google was
 * switched off still has it connected, and a card that quietly dropped the row
 * would be hiding a credential from the page whose whole job is showing them.
 *
 * An empty list means one of three things, and the third is why `failed` is a
 * prop: nothing has been read yet, the realm has no providers, or the read
 * failed. The first waits, the second says so, and the third says nothing at
 * all, because the card above has already said what happened.
 *
 * **Alphabetical, which is the opposite of the login card's order**, and the
 * difference is what each list is for. The buttons on the login and sign-up
 * cards are a call to action: somebody is being asked to press one, so the one
 * most of them can press goes first and the three are ranked by how likely an
 * account is to exist. Nobody is being asked to press anything here. This is a
 * list of what an account already has and what can be done about it, read by
 * somebody looking for one row in it, and a list to look something up in is
 * ordered the way a list is looked something up in. Ranking it by likelihood
 * would be this application guessing at somebody's own credentials, on the one
 * page that knows the answer.
 *
 * Sorted here rather than taken as it arrives. Keycloak happens to answer
 * alphabetically today; that is its own business and not a promise, and the
 * order a page is read in is the page's to decide. The comparison is the
 * reader's language, the way every date on this page is: see `useLanguage`.
 */

/* The mark a provider is drawn at. Bigger than the glyphs in the two tables
 * above, because it is the subject of its row rather than an action on the end
 * of one. */
const MARK = 26;

export function SsoList({
  methods,
  loading,
  failed,
  busyAlias,
  onConnect,
  onDisconnect,
}: {
  methods: SignInMethod[];
  loading: boolean;
  /* Whether the read failed, which is the third thing an empty list can mean
   * and the one it must not report as the second. The message itself is the
   * card's, above this list, the same arrangement `activity-list.tsx` has. */
  failed: boolean;
  /* The provider with something in flight, so its own row can say so without
   * the rest of the card going quiet. */
  busyAlias: string | null;
  onConnect: (method: SignInMethod) => void;
  onDisconnect: (method: SignInMethod) => void;
}) {
  const { language } = useLanguage();

  if (loading)
    return (
      <Stack sx={{ gap: 1, paddingBlock: 1 }}>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} height={56} sx={{ transform: "none" }} />
        ))}
      </Stack>
    );

  /* A realm with no providers at all, which is a fair state and not a broken
   * one: this application ships three aliases the realm may never be given
   * credentials for. It says so rather than drawing an empty card.
   *
   * Not said over a list that could not be read, which is empty for a reason
   * the card has already given above it. Saying both is the card telling
   * somebody their providers are gone and that the failure to read them is
   * why, in the same breath. */
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
        This site does not offer any other way to login yet.
      </Typography>
    );

  return (
    <Box>
      {methods
        .toSorted((one, other) =>
          one.Name.localeCompare(other.Name, language.tag),
        )
        .map((method) => (
          <MethodRow
            key={method.Alias}
            method={method}
            busy={busyAlias === method.Alias}
            onConnect={() => onConnect(method)}
            onDisconnect={() => onDisconnect(method)}
          />
        ))}
    </Box>
  );
}

function MethodRow({
  method,
  busy,
  onConnect,
  onDisconnect,
}: {
  method: SignInMethod;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { Icon } = kindOf(method.Alias);

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
      {/* The provider's mark, in the card's ink like every other glyph on this
       * page. These are the monochrome marks the login card already uses --
       * one flat shape each, not the four-color Google G -- so there is no
       * brand color being thrown away by drawing them in the ink around
       * them. */}
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
        <Typography
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {method.Name}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
            overflowWrap: "anywhere",
          }}
        >
          {says(method)}
        </Typography>
      </Box>

      <Box sx={{ flex: "0 0 auto" }}>{action()}</Box>
    </Stack>
  );

  /* One button, or none. A connected provider that cannot be disconnected
   * shows nothing rather than a disabled button, and the line above it says
   * why instead: a control that refuses when it is pressed makes somebody ask
   * the question twice to get an answer the row could have given first. */
  function action() {
    if (method.Connected && !method.CanDisconnect) return null;
    if (method.Connected)
      return (
        <Button
          type="button"
          variant="outlined"
          size="small"
          disabled={busy}
          onClick={onDisconnect}
          startIcon={
            busy ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          sx={{ fontFamily: "inherit", fontStyle: "normal" }}
        >
          Disconnect
        </Button>
      );
    /* Nothing to offer on a provider the realm has switched off. Connecting
     * one would send somebody to a login page the realm would refuse. */
    if (!method.Available) return null;
    return (
      <Button
        type="button"
        variant="outlined"
        size="small"
        disabled={busy}
        onClick={onConnect}
        startIcon={
          busy ? <CircularProgress size={14} color="inherit" /> : undefined
        }
        sx={{ fontFamily: "inherit", fontStyle: "normal" }}
      >
        Connect
      </Button>
    );
  }
}

/*
 * The line under the provider's name, which is the state of the row in one
 * sentence.
 *
 * Connected says what the account is called over there where the provider will
 * say, because somebody with two Google accounts needs to know which of them
 * this is, and says so again when it is the account's only way in, because
 * that is the row whose missing button needs explaining. Switched off says so
 * plainly: it is the other row with nothing to offer.
 */
function says(method: SignInMethod): string {
  if (method.Connected) {
    const connected = method.ConnectedAs
      ? `Connected as ${method.ConnectedAs}.`
      : "Connected to this account.";
    /* The row with no button, saying why it has none. This is the account
     * whose only way in is this provider, and taking it away would lock
     * somebody out of their own account. */
    return method.CanDisconnect
      ? connected
      : `${connected} It is your only way to login, so it cannot be disconnected.`;
  }
  if (!method.Available) return `${method.Name} is not switched on here yet.`;
  return `Login with your ${method.Name} account.`;
}
