import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import CustomersIcon from "@/shared/icons/CustomersIcon";
import PlusIcon from "@/shared/icons/PlusIcon";
import { useSession } from "../authentication";
import { AccountCard } from "./account-card";
import { Change } from "./change";
import { DailySalesBars, EarningsDonut, SalesLines } from "./charts";
import { CardLabel, CardSurface } from "../card-surface";
import { StatTile } from "./stat-tile";
import {
  averageDailySales,
  count,
  expectedEarnings,
  money,
  monthRevenue,
  newCustomers,
  tiles,
  today,
  weekdays,
  weeklySales,
} from "./metrics";

/*
 * Where a completed sign-in lands: the application itself, laid out from the
 * supplied mock-up -- a greeting, the month against its goal, the day's
 * figures, and three charts.
 *
 * Every number on it but the account card's comes from `metrics.ts` and is a
 * placeholder; see docs/dashboard.md for what is real and what is not. The
 * chrome around it -- the rail, the top bar -- is `app-chrome`, and the
 * session it needs is guarded, both by the `_app` layout route rather than
 * here.
 */

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Dashboard() {
  const { identity } = useSession();

  /* "Thomas John" is greeted as Thomas. A login name gives itself back. */
  const firstName = identity?.name?.split(/\s+/)[0] ?? "there";
  const towards = Math.min(monthRevenue.earned / monthRevenue.goal, 1);
  const remaining = Math.max(monthRevenue.goal - monthRevenue.earned, 0);

  return (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          marginBottom: { xs: 2, md: 2.5 },
        }}
      >
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusIcon color="currentColor" size={16} />}
        >
          Create KPI
        </Button>
      </Stack>

      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack sx={{ gap: { xs: 2, md: 2.5 }, height: "100%" }}>
            <CardSurface>
              <Box sx={{ position: "relative", overflow: "hidden" }}>
                {/* Where the mock-up puts its illustration. Until there is
                 * one, the card is lit rather than filled. */}
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    top: "-40%",
                    right: "-10%",
                    width: 260,
                    height: 260,
                    backgroundImage: (theme) =>
                      `radial-gradient(circle, ${theme.palette.brand.cardTint}, transparent 68%)`,
                    display: { xs: "none", sm: "block" },
                  }}
                />
                <Typography
                  variant="h2"
                  sx={{
                    position: "relative",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    color: (theme) => theme.palette.brand.cardInk,
                  }}
                >
                  {greeting(new Date().getHours())}, {firstName}!
                </Typography>
                <Typography
                  sx={{
                    position: "relative",
                    mt: 1,
                    maxWidth: "38ch",
                    fontSize: "0.88rem",
                    color: (theme) => theme.palette.brand.cardInkMuted,
                  }}
                >
                  Here is what is happening with your programme today.
                </Typography>

                <Stack
                  direction="row"
                  sx={{ position: "relative", gap: 5, mt: 3, flexWrap: "wrap" }}
                >
                  <Box>
                    <CardLabel>Today&rsquo;s visits</CardLabel>
                    <Headline>{count(today.visits)}</Headline>
                  </Box>
                  <Box>
                    <CardLabel>Today&rsquo;s total sales</CardLabel>
                    <Headline>{money(today.sales)}</Headline>
                  </Box>
                </Stack>
              </Box>
            </CardSurface>

            <CardSurface title="This month revenue" sx={{ flex: 1 }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                <Headline>{money(monthRevenue.earned)}</Headline>
                <Change
                  percent={monthRevenue.changePercent}
                  direction={monthRevenue.direction}
                  tinted
                />
              </Stack>

              <Stack
                direction="row"
                sx={{
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 2,
                  mt: "auto",
                  pt: 2.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: (theme) => theme.palette.brand.cardInkMuted,
                  }}
                >
                  {money(remaining)} more to reach {money(monthRevenue.goal)}
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  {Math.round(towards * 100)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={towards * 100}
                aria-label="Progress towards this month's goal"
                sx={{
                  mt: 1,
                  height: 9,
                  borderRadius: 999,
                  backgroundColor: (theme) => theme.palette.brand.chartTrack,
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundImage: (theme) =>
                      theme.palette.brand.buttonGradient,
                  },
                }}
              />
            </CardSurface>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
            {tiles.map((tile) => (
              <Grid key={tile.id} size={{ xs: 12, sm: 6 }}>
                <StatTile tile={tile} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <CardSurface title="Expected earnings">
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1.5, mb: 2 }}
            >
              <Headline>
                {money(
                  expectedEarnings.slices.reduce(
                    (sum, slice) => sum + slice.value,
                    0,
                  ),
                )}
              </Headline>
              <Change
                percent={expectedEarnings.changePercent}
                direction={expectedEarnings.direction}
                tinted
              />
            </Stack>
            <EarningsDonut slices={expectedEarnings.slices} />
          </CardSurface>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <CardSurface title="Average daily sales">
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1.5, mb: 2 }}
            >
              <Headline>{money(averageDailySales.average)}</Headline>
              <Change
                percent={averageDailySales.changePercent}
                direction={averageDailySales.direction}
                tinted
              />
            </Stack>
            <Box sx={{ mt: "auto" }}>
              <DailySalesBars
                values={averageDailySales.values}
                labels={weekdays}
              />
            </Box>
          </CardSurface>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <CardSurface title="Weekly sales">
            <Headline>{money(weeklySales.total)}</Headline>
            <Box sx={{ mt: 2 }}>
              <SalesLines series={weeklySales.series} labels={weekdays} />
            </Box>
          </CardSurface>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <CardSurface title="New customers this month">
            <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
              <Headline>{newCustomers.value}</Headline>
              <Change
                percent={newCustomers.changePercent}
                direction={newCustomers.direction}
                tinted
              />
            </Stack>
            <Stack
              direction="row"
              sx={{ alignItems: "center", gap: 1.25, mt: "auto", pt: 2.5 }}
            >
              <Box
                aria-hidden
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  color: "primary.main",
                  backgroundColor: (theme) => theme.palette.brand.cardTint,
                }}
              >
                <CustomersIcon color="currentColor" size={20} />
              </Box>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: (theme) => theme.palette.brand.cardInkMuted,
                }}
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  +{newCustomers.joinedToday}
                </Box>{" "}
                joined today
              </Typography>
            </Stack>
          </CardSurface>
        </Grid>

        <Grid size={12}>
          <AccountCard />
        </Grid>
      </Grid>
    </>
  );
}

/* The one big figure a card is about. */
function Headline({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: (theme) => theme.typography.h1.fontFamily,
        fontSize: "1.9rem",
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {children}
    </Typography>
  );
}
