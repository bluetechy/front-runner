import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ChevronDownIcon from "@/shared/icons/ChevronDownIcon";
import LogoutIcon from "@/shared/icons/LogoutIcon";
import MenuIcon from "@/shared/icons/MenuIcon";
import SearchIcon from "@/shared/icons/SearchIcon";
import { useSession } from "../authentication";
import { InitialsAvatar } from "../avatar";
import { LanguageMenu } from "../language";
import { NotificationMenu } from "../notifications";

/*
 * The bar along the top of the application: the chrome, the same violet as the
 * rail it meets at the corner, so the two read as one surface the pages are
 * laid inside rather than as two edges of different colours.
 *
 * The search field is the mock-up's and does nothing yet. What is real is the
 * language flag, which remembers what it is told; the bell, which reads the
 * signed-in person's notifications and marks them read; and what is on the
 * right: who is signed in, read from the session, and the menu that signs them
 * out.
 */

export function AppTopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { identity, logout } = useSession();
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const name = identity?.name ?? "—";

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: "flex",
        alignItems: "center",
        gap: { xs: 1, sm: 2 },
        paddingInline: { xs: "1rem", md: "1.5rem" },
        paddingBlock: "0.85rem",
        backgroundColor: (theme) => theme.palette.brand.chrome,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.chromeEdge}`,
        color: (theme) => theme.palette.brand.chromeInk,
      }}
    >
      <IconButton
        aria-label={t("Open navigation")}
        onClick={onOpenNav}
        sx={{ display: { lg: "none" }, color: "inherit" }}
      >
        <MenuIcon size={22} />
      </IconButton>

      <TextField
        placeholder={t("Search here")}
        aria-label={t("Search")}
        size="small"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Box
                  sx={{
                    display: "flex",
                    color: (theme) => theme.palette.brand.chromeLabel,
                  }}
                >
                  <SearchIcon size={18} />
                </Box>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          flex: { xs: 1, md: "0 1 22rem" },
          /* The theme's field is a hollow in the dark panel; this is the same
           * hollow cut into the chrome, which is a shade lighter again. */
          "& .MuiOutlinedInput-root": {
            backgroundColor: (theme) => theme.palette.brand.chromeField,
            color: (theme) => theme.palette.brand.chromeInk,
          },
          "& .MuiOutlinedInput-input::placeholder": {
            color: (theme) => theme.palette.brand.chromeLabel,
            opacity: 1,
          },
        }}
      />

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: { xs: 0.5, sm: 1 },
          marginLeft: "auto",
        }}
      >
        <LanguageMenu />

        <NotificationMenu />

        <Stack
          direction="row"
          component="button"
          type="button"
          aria-label={t("Account")}
          aria-haspopup="menu"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{
            alignItems: "center",
            gap: 1,
            marginLeft: { sm: 1 },
            padding: "0.3rem 0.5rem 0.3rem 0.3rem",
            border: "none",
            borderRadius: 999,
            cursor: "pointer",
            backgroundColor: "transparent",
            color: (theme) => theme.palette.brand.chromeInk,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.brand.chromeHover,
            },
          }}
        >
          <InitialsAvatar name={name} size={36} fontSize="0.85rem" />
          <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "left" }}>
            <Typography
              sx={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.3 }}
            >
              {name}
            </Typography>
            <Typography
              sx={{
                fontSize: "0.72rem",
                lineHeight: 1.3,
                color: (theme) => theme.palette.brand.chromeLabel,
              }}
            >
              {identity?.loginName ?? ""}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              color: (theme) => theme.palette.brand.chromeLabel,
            }}
          >
            <ChevronDownIcon size={16} />
          </Box>
        </Stack>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          /* The application's menus are card paper -- the bar they hang from
           * is the chrome now, and a dark menu on a dark bar would be one
           * surface where there are two; the theme's own are the panel. */
          "& .MuiPaper-root": {
            marginTop: "0.4rem",
            minWidth: 180,
            backgroundColor: (theme) => theme.palette.brand.card,
            backgroundImage: "none",
            border: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
            color: (theme) => theme.palette.brand.cardInk,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            void logout();
          }}
          sx={{ gap: 1.25, fontSize: "0.9rem" }}
        >
          <LogoutIcon size={18} />
          {t("Logout")}
        </MenuItem>
      </Menu>
    </Box>
  );
}
