import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@/shared/icons/CheckCircleIcon";
import { passwordProgress } from "./password-rules";

/*
 * The rules a password has to keep, ticking as they are met.
 *
 * **A list rather than a strength meter.** A meter answers "how good is this",
 * which is a judgment nobody asked for and which no bar can honestly make; a
 * list answers "what is still missing", which is the question somebody typing
 * a password actually has, and every line of it is a thing they can do next.
 *
 * It is drawn before anybody types, with nothing ticked. A list of five
 * requirements standing there is a set of instructions; the same list appearing
 * after a refusal is a telling-off, and somebody choosing a password is better
 * served by being told what is wanted than by finding out one rule at a time.
 *
 * It lives beside `password-rules.ts` rather than on any one card, because all
 * three cards that set a password show it: the sign-up dialog, the page a reset
 * link lands on, and the change-password card on Security & Access. One
 * statement of the rules, one drawing of them.
 *
 * Nothing here is said in color alone, which is the rule the whole product
 * keeps: a met rule gets a tick as well as fuller ink, and the word "done" is
 * in the line for anybody being read it rather than looking at it.
 */

/* Read out, never seen. The same span the dashboard's change arrows use; the
 * lengths are strings because a bare 1 in `sx` is MUI shorthand for 100%. */
const VISUALLY_HIDDEN = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;

/* Which surface this is standing on. Two, because there are two: the violet
 * panel the login dialogs sit on, and the white card behind the login. The
 * component takes the name rather than the colors, so a caller cannot pick a
 * pair that has never been measured -- both of these are, in
 * docs/style-guide.md. */
const TONES = {
  panel: { met: "text.primary", unmet: "text.secondary" },
  card: { met: "brand.cardInk", unmet: "brand.cardInkMuted" },
} as const;

export function PasswordChecklist({
  password,
  tone = "panel",
}: {
  password: string;
  tone?: keyof typeof TONES;
}) {
  const ink = TONES[tone];

  return (
    <Stack
      component="ul"
      aria-label="What a password needs"
      sx={{ listStyle: "none", margin: "0.5rem 0 0", padding: 0, gap: 0.25 }}
    >
      {passwordProgress(password).map(({ rule, met }) => (
        <Stack
          key={rule.label}
          component="li"
          direction="row"
          sx={{
            gap: 0.75,
            alignItems: "center",
            color: met ? ink.met : ink.unmet,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              width: 14,
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {met ? (
              <CheckCircleIcon color="currentColor" size={13} />
            ) : (
              /* A ring where the tick will be, so a line does not shift
               * sideways as it is met and the list does not read as five
               * things and then four. Hidden from a screen reader: "not done"
               * is what the line already says by not saying done. */
              <Box
                aria-hidden
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  border: "1px solid currentColor",
                  opacity: 0.55,
                }}
              />
            )}
          </Box>
          <Typography
            component="span"
            sx={{ fontSize: "0.76rem", lineHeight: 1.6, color: "inherit" }}
          >
            {rule.label}
            {met ? (
              <Box component="span" sx={VISUALLY_HIDDEN}>
                {" "}
                (done)
              </Box>
            ) : null}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
