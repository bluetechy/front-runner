import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
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
import BellIcon from "@/shared/icons/BellIcon";
import ChevronDownIcon from "@/shared/icons/ChevronDownIcon";
import LogoutIcon from "@/shared/icons/LogoutIcon";
import MenuIcon from "@/shared/icons/MenuIcon";
import SearchIcon from "@/shared/icons/SearchIcon";
import { useSession } from "../authentication";
import { LanguageMenu } from "../language";

/*
 * The bar along the top of the application: white paper, the same as a card,
 * so the rail is the only coloured surface in the chrome.
 *
 * The search field and the bell are the mock-up's and do nothing yet. What is
 * real is the language flag, which remembers what it is told; and what is on
 * the right: who is signed in, read from the session, and the menu that signs
 * them out.
 */

/* "Thomas John" -> "TJ". A login name with no space gives one letter, which
 * is the point: it is an avatar, not a label. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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
        backgroundColor: (theme) => theme.palette.brand.card,
        borderBottom: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
        color: (theme) => theme.palette.brand.cardInk,
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
                    color: (theme) => theme.palette.brand.cardInkMuted,
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
          /* The theme's field is a hollow in the dark panel, which on white
           * paper is invisible; on a card it takes the card's own hollow. */
          "& .MuiOutlinedInput-root": {
            backgroundColor: (theme) => theme.palette.brand.cardField,
            color: (theme) => theme.palette.brand.cardInk,
          },
          "& .MuiOutlinedInput-input::placeholder": {
            color: (theme) => theme.palette.brand.cardInkMuted,
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

        <IconButton
          aria-label={t("Notifications")}
          sx={{ color: (theme) => theme.palette.brand.cardInkMuted }}
        >
          <Badge badgeContent={3} color="primary">
            <BellIcon size={20} />
          </Badge>
        </IconButton>

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
            color: (theme) => theme.palette.brand.cardInk,
            "&:hover": {
              backgroundColor: (theme) => theme.palette.brand.cardField,
            },
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: "0.85rem",
              color: "common.white",
              backgroundImage: (theme) => theme.palette.brand.buttonGradient,
            }}
          >
            {initialsOf(name)}
          </Avatar>
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
                color: (theme) => theme.palette.brand.cardInkMuted,
              }}
            >
              {identity?.loginName ?? ""}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              color: (theme) => theme.palette.brand.cardInkMuted,
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
          /* The application's menus are card paper, like everything else on
           * this side of the login; the theme's are the dark panel. */
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
