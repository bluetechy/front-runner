import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import SearchIcon from "@/shared/icons/SearchIcon";
import { useSession, useLoginPrompt } from "../authentication";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

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
          <Box
            component={Link}
            to="/"
            sx={{
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: "1.35rem",
              letterSpacing: "0.01em",
              textDecoration: "none",
              backgroundImage: "linear-gradient(92deg, #f04fb6, #c451ec)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            YourLogo
          </Box>

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
              <Button
                variant="text"
                disableRipple
                disabled={status === "loading"}
                onClick={loginPrompt.open}
              >
                Login
              </Button>
            )}
            <IconButton
              aria-label="Search"
              sx={{
                width: 40,
                height: 40,
                color: "text.primary",
                backgroundImage: (theme) => theme.palette.brand.buttonGradient,
                boxShadow: "0 8px 20px rgba(224, 52, 159, 0.35)",
                "&:hover": { transform: "scale(1.06)" },
              }}
            >
              <SearchIcon size={19} />
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
