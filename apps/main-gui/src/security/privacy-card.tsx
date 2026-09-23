import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";

/*
 * The switch under the table: whether to withhold your address from the other
 * members of your organizations.
 *
 * The copy says what it actually does and stops there. It hides the address
 * from the people in the members list; it does not hide it from the
 * installation, and it does not unsend anything already sent. A sentence
 * promising more than `dbo.GetOrganizationMembers` delivers would be the kind
 * of promise this product should not make in a security page of all places, so
 * the last line says where the address still is.
 *
 * The switch is the control and the heading is its label, which is why the
 * whole block is a `<label>`: the target is then the heading and the paragraph
 * as well as the switch itself, which is a great deal easier to hit than a
 * 34-pixel track.
 */
export function PrivacyCard({
  isPrivate,
  busy,
  onChange,
}: {
  isPrivate: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "flex-start",
        justifyContent: "space-between",
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.55 : 1,
        transition: "opacity 150ms ease",
      }}
    >
      <Stack sx={{ gap: 0.75, minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          Keep my email addresses private
        </Typography>
        {/* One paragraph rather than the two this would be written as
         * elsewhere. The second was the caveat, and a caveat set apart on a
         * line of its own in a card this wide reads as a footnote somebody
         * else added: it belongs in the same breath as the promise it
         * qualifies. */}
        <Muted>
          The members list in each of your organizations shows your name, your
          user name and your email address to everybody else in it. Set this to
          Private and the address is left out of that list; Public leaves it
          there. Your name and user name stay either way, so people still know
          who they are working with. Private only changes what other members are
          shown: it does not remove your address from this account, from mail we
          have already sent, or from an administrator&rsquo;s reach.
        </Muted>
      </Stack>

      <Stack
        direction="row"
        sx={{ gap: 1, alignItems: "center", flexShrink: 0 }}
      >
        {/* The word beside the switch, because a switch alone says its state
         * in position and color and this product says nothing in color
         * alone. Private and Public rather than On and Off: on tells you the
         * switch moved, Private tells you what that did, and the paragraph
         * beside it uses the same two words. */}
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
            input: { "aria-label": "Keep my email addresses private" },
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
              backgroundColor: (theme) => theme.palette.brand.cardSwitchTrackOn,
            },
          }}
        />
      </Stack>
    </Box>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
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
