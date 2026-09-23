import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardSurface } from "../card-surface";
import { useCookieConsent } from "../cookie-consent";
import { UPDATED, sections, type Section } from "./sections";

/*
 * The privacy policy, at /privacy. The cookie notice links here, the
 * preferences dialog links here, and this page is where somebody who wants to
 * change their mind about either lands.
 *
 * It is one sheet of white paper on the field rather than white text on the
 * violet: this is the longest reading anywhere in the product, and card ink
 * on card paper is 18.5:1 against the 4.5:1 a paragraph needs. The same
 * `CardSurface` the dashboard, the profile page and the contact form are made
 * of -- see docs/style-guide.md.
 *
 * The words are in `sections.ts`. This file is how they are laid out and
 * nothing else, except for the one control among them: the cookies section
 * carries the button that opens the preferences dialog, because "you may
 * withdraw your consent" printed next to no way of doing it is not a right,
 * it is a sentence.
 */

export function Privacy() {
  return (
    <Container
      component="section"
      sx={{ paddingBlock: "clamp(2rem, 6vw, 4.5rem) clamp(4rem, 10vw, 7rem)" }}
    >
      <Stack sx={{ alignItems: "center", textAlign: "center" }}>
        <Typography
          variant="h1"
          sx={{ fontSize: "clamp(2.5rem, 5.4vw, 4rem)" }}
        >
          Privacy Policy
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: "52ch", mt: 2, color: "text.secondary" }}
        >
          What this site collects, what allows us to, how long we keep it, and
          what you can tell us to do with it.
        </Typography>
      </Stack>

      <CardSurface
        sx={{
          mt: { xs: 4, md: 6 },
          maxWidth: "78ch",
          marginInline: "auto",
          padding: { xs: "1.75rem 1.5rem", sm: "2.5rem 2.75rem" },
        }}
      >
        <Typography
          sx={{
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          Last updated {UPDATED}
        </Typography>

        {sections.map((section) => (
          <PolicySection key={section.id} section={section} />
        ))}
      </CardSurface>
    </Container>
  );
}

function PolicySection({ section }: { section: Section }) {
  /* The dialog lives above every page, in `routes/__root.tsx`, so opening it
   * from here is one call rather than a second copy of it on this page. */
  const { edit } = useCookieConsent();

  return (
    <Stack component="section" id={section.id} sx={{ mt: 4, gap: 1.5 }}>
      <Typography
        component="h2"
        sx={{
          fontFamily: (theme) => theme.typography.h2.fontFamily,
          fontSize: "1.45rem",
          lineHeight: 1.25,
          color: (theme) => theme.palette.brand.cardInk,
        }}
      >
        {section.heading}
      </Typography>

      {section.paragraphs.map((paragraph) => (
        <Typography
          key={paragraph}
          sx={{
            fontSize: "0.95rem",
            lineHeight: 1.75,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {paragraph}
        </Typography>
      ))}

      {section.points ? (
        <Stack
          component="ul"
          sx={{
            gap: 1,
            margin: 0,
            paddingInlineStart: "1.25rem",
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          {section.points.map((point) => (
            <Typography
              component="li"
              key={point}
              sx={{ fontSize: "0.95rem", lineHeight: 1.75 }}
            >
              {point}
            </Typography>
          ))}
        </Stack>
      ) : null}

      {section.cookieChoices ? (
        <Button
          variant="contained"
          onClick={edit}
          sx={{ alignSelf: "flex-start", mt: 1 }}
        >
          Change your cookie choices
        </Button>
      ) : null}
    </Stack>
  );
}
