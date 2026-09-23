import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link, useRouterState } from "@tanstack/react-router";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { RAIL_WIDTH } from "../app-chrome";
import { useCookieConsent } from "./cookie-consent";
import { CookiePreferences } from "./cookie-preferences";

/*
 * The box that asks, and the way back to it once it has been answered.
 *
 * One mount, in `routes/__root.tsx`, so it is on every page of both shells.
 * It draws whichever of the two is true:
 *
 * - **Nobody has answered.** The bar across the foot of the window, which has
 *   no close button, no X and no backdrop to click away. It is a landmark
 *   rather than a modal -- the page underneath stays readable and usable,
 *   because a site that will not show itself until it has a yes is asking for
 *   a consent that was not freely given -- but the only things that take it
 *   away are the three buttons on it. A named `section` is what makes it a
 *   landmark somebody can jump to, and the heading inside it is the other
 *   half of that.
 * - **Somebody has.** A quiet pill in the corner that opens the preferences
 *   dialog again. Withdrawing has to be as easy as agreeing was, and a choice
 *   with no way back to it is not one.
 *
 * "Reject all" and "Accept all" are the same button twice: same variant, same
 * size, same row, one press each. Neither wears the accent, which is the one
 * place in this product where that rule is set by something other than taste
 * -- giving the accent to one of two supposedly equal answers is exactly the
 * nudge the CNIL has fined people for. "Manage preferences" is quieter than
 * both because it is a third thing and not a third answer.
 */

export function CookieNotice() {
  const { decision, edit } = useCookieConsent();

  return (
    <>
      {decision === null ? <NoticeBar /> : <ReopenPill onClick={edit} />}
      {/* Mounted either way: the bar opens it, and so does the pill. */}
      <CookiePreferences />
    </>
  );
}

function NoticeBar() {
  const { edit, acceptAll, rejectAll } = useCookieConsent();
  const { t } = useTranslation();
  const titleId = useId();
  const bodyId = useId();

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        /* Over the rail, which is a drawer: the question has to be reachable
         * from every page, and behind the login the rail owns that corner. */
        zIndex: (theme) => theme.zIndex.drawer + 2,
        backgroundColor: (theme) => theme.palette.brand.panel,
        borderTop: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
        boxShadow: (theme) => theme.palette.brand.panelGlow,
      }}
    >
      <Container sx={{ paddingBlock: { xs: "1.1rem", sm: "1.35rem" } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{ gap: { xs: 2, md: 4 }, alignItems: { md: "center" } }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              id={titleId}
              component="h2"
              sx={{ fontSize: "1.05rem", fontWeight: 600 }}
            >
              {t("Cookies on this site")}
            </Typography>
            <Typography
              id={bodyId}
              variant="body2"
              sx={{
                mt: 0.5,
                maxWidth: "70ch",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              {t(
                "Some cookies keep you signed in and keep the site working, so they are always on. The rest, such as counting visits, run only if you allow them. You can change your mind at any time.",
              )}{" "}
              <Typography
                component={Link}
                to="/privacy"
                sx={{
                  fontSize: "inherit",
                  color: "primary.light",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {t("Privacy Policy")}
              </Typography>
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              gap: 1.25,
              alignItems: { sm: "center" },
              flexShrink: 0,
            }}
          >
            {/* The two answers, in one row, identical. */}
            <Button variant="outlined" onClick={rejectAll}>
              {t("Reject all")}
            </Button>
            <Button variant="outlined" onClick={acceptAll}>
              {t("Accept all")}
            </Button>
            <Button variant="text" onClick={edit}>
              {t("Manage preferences")}
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

/*
 * The way back, once there is something to come back to.
 *
 * Behind the login the rail takes the bottom left corner from `lg` up, so the
 * pill steps past it there rather than sitting on the nav. Which shell is
 * drawn is the router's answer and not a guess: `_app` is the layout route
 * every page with a rail sits under.
 */
function ReopenPill({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const railed = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === "/_app"),
  });

  return (
    <Button
      variant="text"
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: "1rem",
        left: railed
          ? { xs: "1rem", lg: `calc(${RAIL_WIDTH}px + 1rem)` }
          : "1rem",
        zIndex: (theme) => theme.zIndex.drawer + 2,
        padding: "0.4rem 1rem",
        borderRadius: 999,
        fontSize: "0.8rem",
        color: (theme) => theme.palette.brand.navText,
        backgroundColor: (theme) => theme.palette.brand.panel,
        border: (theme) => `1px solid ${theme.palette.brand.panelEdge}`,
        "&:hover": {
          backgroundColor: (theme) => theme.palette.brand.panel,
          color: "text.primary",
        },
      }}
    >
      {t("Cookie settings")}
    </Button>
  );
}
