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
        <Muted>
          The members list in each of your organizations shows your name, your
          user name and your email address to everybody else in it. Turn this on
          and the address is left out of that list. Your name and user name
          stay, so people still know who they are working with.
        </Muted>
        <Muted>
          This changes what other members are shown. It does not remove your
          address from this account, from mail we have already sent, or from an
          administrator&rsquo;s reach.
        </Muted>
      </Stack>

      <Stack
        direction="row"
        sx={{ gap: 1, alignItems: "center", flexShrink: 0 }}
      >
        {/* The word beside the switch, because a switch alone says its state
         * in position and color and this product says nothing in color
         * alone. */}
        <Typography
          component="span"
          aria-hidden
          sx={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {isPrivate ? "On" : "Off"}
        </Typography>
        <Switch
          checked={isPrivate}
          disabled={busy}
          onChange={(event) => onChange(event.target.checked)}
          slotProps={{
            input: { "aria-label": "Keep my email addresses private" },
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
        maxWidth: "62ch",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}
