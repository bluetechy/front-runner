import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useSession, useLoginPrompt } from "../authentication";
import { Logo } from "../logo";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact-us", label: "Contact" },
] as const;

/*
 * The two buttons on the right are the page's own pair -- the outline and the
 * gradient the hero uses -- cut down to the height of a bar. A full-size pill
 * up here would stand taller than the row it sits in.
 */
const barButton = {
  padding: "0.4rem 1.25rem",
  fontSize: "0.85rem",
} as const;

export function SiteHeader() {
  const { status, identity, logout } = useSession();
  const loginPrompt = useLoginPrompt();

  return (
    <AppBar>
      <Container>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: { xs: "wrap", md: "nowrap" },
            justifyContent: { xs: "space-between", md: "flex-start" },
          }}
        >
          {/* The word alone up here: the mark would be one more thing in a
           * row that is already navigation and a pair of buttons. */}
          <Logo to="/" mark={false} size="1.35rem" />

          <Stack
            component="nav"
            aria-label="Main"
            direction="row"
            sx={{
              /* Below md the nav takes a row of its own under the logo. */
              order: { xs: 3, md: 0 },
              flexBasis: { xs: "100%", md: "auto" },
              flexGrow: 1,
              flexWrap: "wrap",
              justifyContent: { xs: "flex-start", md: "center" },
              columnGap: { xs: "1.4rem", md: "clamp(1.25rem, 3vw, 2.6rem)" },
              rowGap: "0.6rem",
            }}
          >
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={Link}
                to={item.to}
                activeOptions={{ exact: true }}
                variant="text"
                disableRipple
                sx={{
                  position: "relative",
                  paddingBottom: "0.35rem",
                  borderRadius: 0,
                  fontSize: { xs: "0.85rem", sm: "0.95rem" },
                  /* TanStack Router marks the current route for us. */
                  '&[data-status="active"]': {
                    color: "text.primary",
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      insetInline: 0,
                      bottom: 0,
                      height: 2,
                      borderRadius: 2,
                      backgroundColor: "primary.light",
                    },
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {/* "loading" is the moment a remembered session is being
             * restored; showing "Login" through it would make an already
             * signed-in visitor flicker as though they were not. */}
            {status === "signed-in" ? (
              <>
                <Typography
                  component={Link}
                  to="/dashboard"
                  variant="body2"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    color: "text.secondary",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {identity?.name}
                </Typography>
                <Button
                  variant="text"
                  disableRipple
                  onClick={() => void logout()}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  disabled={status === "loading"}
                  onClick={loginPrompt.open}
                  sx={barButton}
                >
                  Login
                </Button>
                {/* The sign-up card, which is the login card's twin: the
                 * prompt owns both and swaps between them. */}
                <Button
                  variant="contained"
                  disabled={status === "loading"}
                  onClick={loginPrompt.signUp}
                  sx={barButton}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
