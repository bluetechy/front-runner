import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Toast, type Notice, type ToastTone } from "../toast";
import { MessageForm } from "./message-form";
import { WayCard } from "./way-card";
import { ways } from "./ways";

/*
 * The contact page, at /contact-us. Its shape is the supplied page's: the
 * three ways to reach us across the top, then a message form with the reason
 * to use it written beside it rather than above it.
 *
 * The colors are this app's. The supplied page bands the top half in teal
 * and paints the discs gray; here the three ways sit straight on the violet
 * field like every other section in the product, because a band would be a
 * fifth surface and this app has four -- see docs/style-guide.md.
 *
 * `notice` is how the page says something back, thrown as a toast into the
 * bottom right corner the way the profile page does it. Nothing is said until
 * `sendMessage` has answered; what that does today is written down in
 * `send-message.ts`, and every line of contact detail on this page is
 * invented -- see `ways.ts` and docs/contact-page.md.
 */

export function ContactUs() {
  const [notice, setNotice] = useState<Notice | null>(null);

  const notify = useCallback(
    (message: string, tone: ToastTone = "info") => setNotice({ message, tone }),
    [],
  );

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
          Contact Us
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: "46ch", mt: 2, color: "text.secondary" }}
        >
          One number, one office and one inbox. Whichever you use, it reaches
          the people who build this.
        </Typography>
      </Stack>

      <Grid
        container
        spacing={{ xs: 5, md: 4 }}
        sx={{ mt: { xs: 4, md: 6 }, alignItems: "flex-start" }}
      >
        {ways.map((way) => (
          <Grid key={way.id} size={{ xs: 12, md: 4 }}>
            <WayCard way={way} />
          </Grid>
        ))}
      </Grid>

      <Grid
        container
        spacing={{ xs: 4, md: 6 }}
        sx={{ mt: { xs: 7, md: 10 }, alignItems: "flex-start" }}
      >
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography
            variant="h2"
            sx={{ fontSize: "clamp(1.9rem, 3.6vw, 2.6rem)" }}
          >
            Message us
          </Typography>
          <Typography
            variant="body1"
            sx={{ maxWidth: "40ch", mt: 2, color: "text.secondary" }}
          >
            Tell us what you are trying to get people to do (a class, a team, a
            customer program) and we will say whether this does it, what it
            would cost, and what moving an existing program across would take.
          </Typography>
          {/* The same redirect the supplied page makes, pointed at the thing
           * this product actually has: somebody already signed in has a way
           * in that knows who they are, and it is a better answer than an
           * inbox that does not. */}
          <Typography
            variant="body1"
            sx={{ maxWidth: "40ch", mt: 2, color: "text.secondary" }}
          >
            Already signed in and something is wrong?{" "}
            <Typography
              component={Link}
              to="/customer-service"
              sx={{
                fontSize: "inherit",
                color: "primary.light",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Customer service
            </Typography>{" "}
            reaches the same people and already knows your account.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <MessageForm onNotice={notify} />
        </Grid>
      </Grid>

      <Toast notice={notice} onClose={() => setNotice(null)} />
    </Container>
  );
}
