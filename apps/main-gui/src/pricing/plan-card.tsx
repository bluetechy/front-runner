import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import CheckCircleIcon from "@/shared/icons/CheckCircleIcon";
import {
  amountOf,
  annualTotal,
  CONTACT_BUTTON,
  money,
  monthlyRate,
  percentOff,
  START_BUTTON,
  type Billing,
  type Plan,
} from "./plans";

/*
 * One plan, as white paper on the violet field. Everything inside it is drawn
 * in the card's own ink rather than the app's -- see `brand.card*` in the
 * theme -- because the page's usual white-on-violet is invisible here.
 *
 * The featured card sits on the same line as the others, takes the same dark
 * rule round the outside and wears the same button. What carries it forward
 * is its paper, which is the accent breathed onto white, the badge beside its
 * name, and a deeper shadow.
 */

/* The small print under the price, saying what the figure above it really
 * costs. Four plans' worth of cases, which is one more than a ternary should
 * be asked to hold. */
function priceNote(plan: Plan, billing: Billing): string {
  if (plan.monthlyPrice === null)
    return "Priced on how many people you have and what you need.";
  if (plan.monthlyPrice === 0) return "Free forever. No card, no trial clock.";
  if (billing === "monthly")
    return `Billed monthly. Switch to yearly and save ${percentOff}.`;

  const once = money(annualTotal(plan.monthlyPrice));
  return plan.unit === "member"
    ? `${once} billed once a year, per member`
    : `${once} billed once a year`;
}

export function PlanCard({
  plan,
  billing,
  onChoose,
}: {
  plan: Plan;
  billing: Billing;
  onChoose: () => void;
}) {
  /* null is the plan you have to ask about; every other plan has a figure. */
  const rate =
    plan.monthlyPrice === null ? null : monthlyRate(plan.monthlyPrice, billing);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: { xs: "1.75rem 1.5rem", sm: "2rem 1.9rem" },
        borderRadius: "1.75rem",
        backgroundColor: (theme) =>
          plan.featured
            ? theme.palette.brand.cardFeatured
            : theme.palette.brand.card,
        border: (theme) => `2px solid ${theme.palette.brand.cardEdge}`,
        color: (theme) => theme.palette.brand.cardInk,
        boxShadow: plan.featured
          ? "0 26px 60px rgba(10, 2, 24, 0.45)"
          : "0 14px 34px rgba(10, 2, 24, 0.25)",
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Typography
          component="h3"
          sx={{
            fontFamily: (theme) => theme.typography.h1.fontFamily,
            fontSize: "1.5rem",
            fontWeight: 600,
          }}
        >
          {plan.name}
        </Typography>

        {plan.featured ? (
          <Typography
            component="span"
            sx={{
              paddingInline: "0.7rem",
              paddingBlock: "0.3rem",
              borderRadius: 999,
              whiteSpace: "nowrap",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1,
              color: (theme) => theme.palette.brand.cardBadgeInk,
              backgroundImage: (theme) => theme.palette.brand.cardBadge,
            }}
          >
            Most popular
          </Typography>
        ) : null}
      </Stack>

      <Typography
        sx={{
          mt: 0.75,
          fontSize: "0.85rem",
          lineHeight: 1.6,
          color: (theme) => theme.palette.brand.cardInkMuted,
          /* Holds the price line level across a row of cards whose taglines
           * run to one line or to two. */
          minHeight: { md: "3.2em" },
        }}
      >
        {plan.tagline}
      </Typography>

      {/* The same height whichever cadence is showing, so switching between
       * them does not shuffle everything underneath. */}
      <Box sx={{ mt: 2.5, minHeight: "5.25rem" }}>
        {rate === null ? (
          <Typography
            sx={{
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontSize: "2.6rem",
              lineHeight: 1.1,
              fontWeight: 600,
            }}
          >
            Let&rsquo;s talk
          </Typography>
        ) : (
          <Stack direction="row" sx={{ alignItems: "baseline", gap: 0.75 }}>
            <Typography
              component="span"
              sx={{
                fontFamily: (theme) => theme.typography.h1.fontFamily,
                fontSize: "2.6rem",
                lineHeight: 1.1,
                fontWeight: 600,
              }}
            >
              <Box
                component="span"
                sx={{
                  fontSize: "0.52em",
                  verticalAlign: "0.52em",
                  marginRight: "0.06em",
                }}
              >
                $
              </Box>
              {amountOf(rate)}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: "0.85rem",
                color: (theme) => theme.palette.brand.cardInkMuted,
              }}
            >
              {plan.unit === "member" ? "per member / month" : "per month"}
            </Typography>
          </Stack>
        )}

        <Typography
          sx={{
            mt: 0.5,
            fontSize: "0.78rem",
            lineHeight: 1.6,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {priceNote(plan, billing)}
        </Typography>
      </Box>

      {/* One button, on every card, painted the same way on all of them: the
       * plan being pushed is said by its paper and its badge rather than by
       * being the only card with a lit button. What changes here is whether
       * it starts a plan or asks about one, and that is the same question
       * that decides which of the two labels it wears. */}
      <Button
        variant="contained"
        fullWidth
        {...(plan.contactSales
          ? { component: Link, to: "/contact-us" }
          : { onClick: onChoose })}
        sx={{ mt: 2.5 }}
      >
        {plan.contactSales ? CONTACT_BUTTON : START_BUTTON}
      </Button>

      <Divider
        sx={{
          my: 2.5,
          borderColor: (theme) => theme.palette.brand.cardRule,
        }}
      />

      <Typography
        sx={{
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {plan.inherits ? `Everything in ${plan.inherits}, plus:` : "Includes:"}
      </Typography>

      <Stack component="ul" spacing={1.1} sx={{ p: 0, m: 0, mt: 1.5 }}>
        {plan.features.map((feature) => (
          <Stack
            component="li"
            key={feature}
            direction="row"
            sx={{ gap: 1, alignItems: "flex-start", listStyle: "none" }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{ display: "flex", pt: "0.2rem", color: "primary.main" }}
            >
              <CheckCircleIcon color="currentColor" size={16} />
            </Box>
            <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
              {feature}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
