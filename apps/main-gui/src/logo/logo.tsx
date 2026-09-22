import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Link } from "@tanstack/react-router";
import KpiIcon from "@/shared/icons/KpiIcon";

/*
 * The product's logo: the mark, and the word beside it.
 *
 * It is drawn in two places -- the marketing header and the top of the rail
 * -- and it was written out twice, which is how it came to be a magenta fade
 * on one side of the login and white on the other for a while. This is the
 * one file now: what it says, what it is set in, what it is painted with, and
 * whether the mark is there at all.
 *
 * The word is text rather than artwork on purpose. It is set in the display
 * face the rest of the product's headings are, it is selectable, it is read
 * aloud, and it survives being made bigger -- none of which a traced path
 * would do. The mark beside it *is* a vector, through `shared/icons`, so what
 * a caller would want to manipulate -- its size, its colour -- is already
 * props. The day this becomes a real wordmark somebody drew, it is a `<svg>`
 * in here and the two callers do not learn about it.
 */

/* What it says. One place. */
const WORDMARK = "YourLogo";

export function Logo({
  to,
  mark = true,
  size = "1.3rem",
  markSize = 24,
  sx,
}: {
  /* Where clicking it goes. Left out, it is a logo rather than a link. */
  to?: string;
  /* The glyph before the word. The marketing header sets the word alone --
   * it has a row of navigation to sit in and nothing to be found among. */
  mark?: boolean;
  /* How big the word is. */
  size?: string;
  /* And the mark, in pixels, because that is what an icon takes. */
  markSize?: number;
  /* Where it sits: the padding and the alignment belong to the surface it is
   * on, not to the logo. */
  sx?: SxProps<Theme>;
}) {
  const root: SxProps<Theme> = {
    alignItems: "center",
    gap: mark ? 1.25 : 0,
    textDecoration: "none",
    /* The mark takes this through `currentColor`; the word paints over it
     * with the whole fade. */
    color: (theme) => theme.palette.brand.logoMark,
    ...sx,
  };

  const inside = (
    <>
      {mark ? <KpiIcon size={markSize} /> : null}
      <Typography
        component="span"
        sx={{
          fontFamily: (theme) => theme.typography.h1.fontFamily,
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: size,
          letterSpacing: "0.01em",
          backgroundImage: (theme) => theme.palette.brand.logoGradient,
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {WORDMARK}
      </Typography>
    </>
  );

  return to === undefined ? (
    <Stack direction="row" sx={root}>
      {inside}
    </Stack>
  ) : (
    <Stack component={Link} to={to} direction="row" sx={root}>
      {inside}
    </Stack>
  );
}
