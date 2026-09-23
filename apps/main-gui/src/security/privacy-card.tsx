import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { CardSurface } from "../card-surface";

/*
 * The switch under the table: whether to share your address with the other
 * members of your organizations.
 *
 * Private is where every account starts. `dbo.ProvisionUser` writes
 * `EmailIsPrivate` true when the account is created, and every reader of it
 * treats a missing answer the same way, so this switch is read as the way an
 * address is given away rather than the way it is taken back. The copy leads
 * with that, because a setting somebody has already been given reads as a
 * promise rather than a chore.
 *
 * The rest of the copy says what it actually does and stops there. It hides
 * the address from the people in the members list; it does not hide it from
 * the installation, and it does not unsend anything already sent. A sentence
 * promising more than `dbo.GetOrganizationMembers` delivers would be the kind
 * of promise this product should not make in a security page of all places, so
 * the last line says where the address still is.
 *
 * This is the one card on the page that draws its own `CardSurface`, because
 * the control belongs on the card's title line: EMAIL PRIVACY on the left and
 * the switch opposite it, centered against it, which is the row `action` is
 * for. The card and the switch are one thing, so one component owns both, and
 * `sx` is left to the page, because the space between two cards is the page's
 * business rather than the card's.
 *
 * Nothing here is wrapped in a `<label>` any more, for the same reason: the
 * switch and the paragraph are in two halves of the card now. They are tied by
 * `htmlFor` instead, so the paragraph is still a target -- a good deal easier
 * to hit than a 34-pixel track -- and the switch still carries the aria-label
 * that names it, which is what a screen reader reads either way.
 */
const SWITCH_ID = "email-privacy";

export function PrivacyCard({
  isPrivate,
  busy,
  onChange,
  sx,
}: {
  isPrivate: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
  sx?: SxProps<Theme>;
}) {
  /* A save is running, so both halves say so and neither is worth pressing. */
  const dimmed = {
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.55 : 1,
    transition: "opacity 150ms ease",
  };

  return (
    <CardSurface
      title="Email Privacy"
      action={
        <Box
          component="label"
          htmlFor={SWITCH_ID}
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexShrink: 0,
            ...dimmed,
          }}
        >
          {/* The word beside the switch, because a switch alone says its
           * state in position and color and this product says nothing in
           * color alone. Private and Public rather than On and Off: on tells
           * you the switch moved, Private tells you what that did, and the
           * paragraph beside it uses the same two words. */}
          <Typography
            component="span"
            aria-hidden
            sx={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            {isPrivate ? "Private" : "Public"}
          </Typography>
          <Switch
            checked={isPrivate}
            disabled={busy}
            onChange={(event) => onChange(event.target.checked)}
            slotProps={{
              input: {
                id: SWITCH_ID,
                "aria-label": "Keep my email addresses private",
              },
            }}
            /* Material draws this one for a dark surface: a track at white 30%
             * and a thumb barely off white, which on card paper is a control
             * you have to already know is there, and off is the state that
             * shows least of all. Both ends of it come off `brand.cardSwitch*`
             * now, where the ratios are written down. */
            sx={{
              "& .MuiSwitch-track": {
                opacity: 1,
                backgroundColor: (theme) => theme.palette.brand.cardSwitchTrack,
              },
              "& .MuiSwitch-thumb": {
                backgroundColor: (theme) => theme.palette.brand.cardSwitchThumb,
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                opacity: 1,
                backgroundColor: (theme) =>
                  theme.palette.brand.cardSwitchTrackOn,
              },
            }}
          />
        </Box>
      }
      sx={sx}
    >
      {/* One paragraph rather than the three this would be written as
       * elsewhere. The last sentence is the caveat, and a caveat set apart on
       * a line of its own in a card this wide reads as a footnote somebody
       * else added: it belongs in the same breath as the promise it
       * qualifies. */}
      <Typography
        component="label"
        htmlFor={SWITCH_ID}
        sx={{
          display: "block",
          fontSize: "0.82rem",
          lineHeight: 1.7,
          color: (theme) => theme.palette.brand.cardInkMuted,
          ...dimmed,
        }}
      >
        Your email addresses are Private to begin with: the members list in each
        of your organizations leaves your email address out, and shows your name
        and user name to everybody else in it. Set this to Public if you would
        rather share your email address with the other members, and back to
        Private whenever you would rather they did not see it. Your name and
        user name stay either way, so people still know who they are working
        with. Private only changes what other members are shown: it does not
        remove your email address from this account, from mail we have already
        sent, or from an administrator&rsquo;s reach.
      </Typography>
    </CardSurface>
  );
}
