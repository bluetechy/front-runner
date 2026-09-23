import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Way } from "./ways";

/*
 * One way of reaching us, in the shape the supplied page draws it: a glyph on
 * a disc, the heading under it, and the thing itself under that.
 *
 * The supplied page paints the discs in a flat grey, which is a colour this
 * product does not own. They are the panel's violet here with the panel's own
 * hairline round them -- the same surface the questions on the pricing page
 * sit on -- and the glyph inside is `primary.light`, which is 4.86:1 against
 * that panel and well over the 3:1 something drawn rather than written needs.
 *
 * The disc is not the accent's fade, and this row is not three offers. What
 * is being offered on this page is the button at the bottom of the form; if
 * these wore the fade as well, none of the four would be the accent. See
 * docs/style-guide.md.
 */

export function WayCard({ way }: { way: Way }) {
  const { icon: Icon, heading, lines, href, note } = way;
  const [first, ...rest] = lines;

  return (
    <Stack sx={{ alignItems: "center", textAlign: "center" }}>
      <Box
        aria-hidden
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "5.5rem",
          height: "5.5rem",
          borderRadius: "50%",
          color: "primary.light",
          backgroundColor: (theme) => theme.palette.brand.panel,
          border: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
        }}
      >
        <Icon color="currentColor" size={34} />
      </Box>

      <Typography
        component="h3"
        sx={{
          mt: 2.25,
          fontFamily: (theme) => theme.typography.h1.fontFamily,
          fontSize: "1.35rem",
          fontWeight: 600,
        }}
      >
        {heading}
      </Typography>

      <Stack sx={{ mt: 1, gap: 0.25 }}>
        {/* The first line is the one that is pressed, where the way can be:
         * the number is what you ring and the address is what you write to,
         * and the lines under a street are not separately useful. */}
        <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
          {href ? (
            <Link
              href={href}
              underline="hover"
              sx={{ color: "inherit", "&:hover": { color: "primary.light" } }}
            >
              {first}
            </Link>
          ) : (
            first
          )}
        </Typography>
        {rest.map((line) => (
          <Typography key={line} sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
            {line}
          </Typography>
        ))}
      </Stack>

      <Typography
        variant="body2"
        sx={{ maxWidth: "26ch", mt: 1.25, color: "text.secondary" }}
      >
        {note}
      </Typography>
    </Stack>
  );
}
