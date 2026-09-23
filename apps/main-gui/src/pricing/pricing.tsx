import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLoginPrompt } from "../authentication";
import { Faq } from "./faq";
import { PlanCard } from "./plan-card";
import { audiences, percentOff, type AudienceId, type Billing } from "./plans";

/*
 * The pricing page: who the plans are for, how often you pay, a row of cards,
 * and the questions people ask before they sign up.
 *
 * The shape is ChatGPT's -- a segmented control over a row of cards, each one
 * a price and a list -- with the closing FAQ from Gamma's. The colors are
 * this app's, except for the cards themselves, which are white paper on the
 * violet field. See docs/pricing-page.md.
 *
 * Every plan but Enterprise starts in the sign-in dialog, the same one the
 * header opens, because signing up is signing in for the first time.
 * Enterprise goes to /contact-us, since that plan is a conversation.
 */

export function Pricing() {
  const [audienceId, setAudienceId] = useState<AudienceId>("individual");
  const [billing, setBilling] = useState<Billing>("monthly");
  const loginPrompt = useLoginPrompt();

  /* The id is what the segmented control holds, so the audience is looked up
   * from it. The fallback is unreachable -- the control only ever offers ids
   * from this list -- and is here so the lookup has no undefined to spread. */
  const audience =
    audiences.find((candidate) => candidate.id === audienceId) ?? audiences[0];

  /* Three cards want a third of the row each; two want half, inside a
   * narrower container so they do not stretch into billboards. */
  const columnSize = audience.plans.length === 2 ? 6 : 4;
  const rowWidth = audience.plans.length === 2 ? "58rem" : "none";

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
          Pricing
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: "46ch", mt: 2, color: "text.secondary" }}
        >
          Start free, and pay only once the program is worth paying for. Every
          plan carries points, badges and levels; the plans above it add the
          machinery around them.
        </Typography>

        <ToggleButtonGroup
          value={audienceId}
          onChange={(_event, next: AudienceId | null) => {
            if (next) setAudienceId(next);
          }}
          aria-label="Who the plans are for"
          sx={{ mt: 4 }}
        >
          {audiences.map((candidate) => (
            <ToggleButton key={candidate.id} value={candidate.id}>
              {candidate.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={billing}
          onChange={(_event, next: Billing | null) => {
            if (next) setBilling(next);
          }}
          aria-label="How often you pay"
          sx={{ mt: 2 }}
        >
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="annual">
            Yearly &mdash; save {percentOff}
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography
          variant="body2"
          sx={{ mt: 2.5, maxWidth: "52ch", color: "text.secondary" }}
        >
          {audience.summary}
        </Typography>
      </Stack>

      <Grid
        container
        spacing={{ xs: 3, md: 3.5 }}
        sx={{
          mt: { xs: 4, md: 6 },
          mx: "auto",
          maxWidth: rowWidth,
          alignItems: "stretch",
        }}
      >
        {audience.plans.map((plan) => (
          <Grid key={plan.id} size={{ xs: 12, md: columnSize }}>
            <PlanCard
              plan={plan}
              billing={billing}
              onChoose={loginPrompt.open}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: { xs: 7, md: 10 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.9rem, 3.6vw, 2.6rem)", textAlign: "center" }}
        >
          Questions, before you sign up
        </Typography>
        <Box sx={{ mt: { xs: 3, md: 4.5 } }}>
          <Faq />
        </Box>
      </Box>

      {/* Gamma closes its pricing page on a band rather than on the last
       * answer, which keeps the page from ending in a shrug. */}
      <Stack
        sx={{
          mt: { xs: 6, md: 9 },
          alignItems: "center",
          textAlign: "center",
          padding: { xs: "2.5rem 1.75rem", md: "3.5rem" },
          borderRadius: "1.75rem",
          backgroundColor: (theme) => theme.palette.brand.panel,
          border: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
          boxShadow: (theme) => theme.palette.brand.panelGlow,
        }}
      >
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.7rem, 3.2vw, 2.3rem)" }}
        >
          Still deciding?
        </Typography>
        <Typography
          variant="body1"
          sx={{ maxWidth: "48ch", mt: 1.5, color: "text.secondary" }}
        >
          Tell us what you are trying to get people to do and we will say which
          plan covers it. Schools, nonprofits and companies under a year old get
          a discount worth asking about.
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{ flexWrap: "wrap", mt: 3.5, justifyContent: "center" }}
        >
          <Button variant="contained" onClick={loginPrompt.open}>
            Start free
          </Button>
          <Button variant="outlined" component={Link} to="/contact-us">
            Talk to us
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
