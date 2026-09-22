import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";
import AchievementsIcon from "@/shared/icons/AchievementsIcon";
import CertificationsIcon from "@/shared/icons/CertificationsIcon";
import CustomerServiceIcon from "@/shared/icons/CustomerServiceIcon";
import DashboardIcon from "@/shared/icons/DashboardIcon";
import type IconProps from "@/shared/icons/IconProps";
import KpiIcon from "@/shared/icons/KpiIcon";
import ProfileIcon from "@/shared/icons/ProfileIcon";
import ScheduleIcon from "@/shared/icons/ScheduleIcon";
import SettingsIcon from "@/shared/icons/SettingsIcon";
import TutorialsIcon from "@/shared/icons/TutorialsIcon";
import { useSession } from "../authentication";

/*
 * The rail down the left edge of the application. It is fixed there rather
 * than floated on the field -- the mock-up insets it, and the ask was for it
 * to meet the edge -- so from `lg` up it is a permanent drawer taking its own
 * column out of the flow, and below that a temporary one the top bar's
 * hamburger opens over the page.
 *
 * The logo, whoever is signed in, and then the nav in three named groups.
 * Command Center is the only item with a route behind it; the rest name the
 * sections this product is going to have, and are disabled until they exist,
 * because a nav link that goes nowhere is worse than one that says so.
 */

export const RAIL_WIDTH = 258;

interface NavItem {
  label: string;
  icon: FC<IconProps>;
  to?: "/dashboard";
}

interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

const navGroups: readonly NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Command Center", icon: DashboardIcon, to: "/dashboard" },
      { label: "Schedule", icon: ScheduleIcon },
      { label: "Achievements", icon: AchievementsIcon },
      { label: "Certifications", icon: CertificationsIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: ProfileIcon },
      { label: "Settings", icon: SettingsIcon },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tutorials", icon: TutorialsIcon },
      { label: "Customer Service", icon: CustomerServiceIcon },
    ],
  },
];

/*
 * What the person signed in is here as. Placeholder: neither the token nor
 * the `me` query carries a title, and the nearest thing either of them has is
 * the account's admin flag. One line to change when there is a real one.
 */
const POSITION = "Programme manager";

/* "Test User" -> "TU". A login name with no space gives one letter, which is
 * the point: it is an avatar, not a label. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function RailContents({ onNavigate }: { onNavigate: () => void }) {
  const { identity } = useSession();
  const name = identity?.name ?? "—";

  return (
    <>
      <Stack
        component={Link}
        to="/dashboard"
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "center",
          gap: 1.25,
          padding: "1.6rem 1.5rem 1.1rem",
          textDecoration: "none",
          color: "common.white",
        }}
      >
        <KpiIcon size={24} />
        <Typography
          component="span"
          sx={{
            fontFamily: (theme) => theme.typography.h1.fontFamily,
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "1.3rem",
            letterSpacing: "0.01em",
          }}
        >
          YourLogo
        </Typography>
      </Stack>

      {/* Whoever is signed in. The picture is their initials until there is
       * somewhere to get a photograph from -- the token carries none. */}
      <Stack sx={{ alignItems: "center", paddingInline: "1.5rem" }}>
        <Avatar
          sx={{
            width: 68,
            height: 68,
            fontSize: "1.4rem",
            fontWeight: 600,
            color: "common.white",
            backgroundColor: (theme) => theme.palette.brand.railActive,
            border: (theme) => `3px solid ${theme.palette.brand.railEdge}`,
          }}
        >
          {initialsOf(name)}
        </Avatar>
        <Typography
          sx={{
            mt: 1.25,
            fontSize: "0.98rem",
            fontWeight: 600,
            textAlign: "center",
            color: "common.white",
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.78rem",
            color: (theme) => theme.palette.brand.railLabel,
          }}
        >
          {POSITION}
        </Typography>
      </Stack>

      <Divider
        sx={{
          mt: 2,
          marginInline: "1.4rem",
          borderColor: (theme) => theme.palette.brand.railEdge,
        }}
      />

      <Box component="nav" aria-label="Application" sx={{ paddingBottom: 2 }}>
        {navGroups.map((group) => (
          <List
            key={group.label}
            subheader={
              <Typography
                component="h2"
                sx={{
                  paddingInline: "1.5rem",
                  paddingBottom: "0.35rem",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: (theme) => theme.palette.brand.railLabel,
                }}
              >
                {group.label}
              </Typography>
            }
            sx={{ paddingInline: "0.9rem", paddingBlock: "0.9rem 0" }}
          >
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const contents = (
                <>
                  <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
                    <ItemIcon size={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: { sx: { fontSize: "0.92rem", fontWeight: 500 } },
                    }}
                  />
                </>
              );

              return (
                <ListItem
                  key={item.label}
                  disablePadding
                  sx={{ marginBottom: 0.25 }}
                >
                  {item.to ? (
                    <ListItemButton
                      component={Link}
                      to={item.to}
                      activeOptions={{ exact: true }}
                      onClick={onNavigate}
                      sx={itemStyle}
                    >
                      {contents}
                    </ListItemButton>
                  ) : (
                    /* Not built yet, and saying so is the whole point. */
                    <ListItemButton disabled sx={itemStyle}>
                      {contents}
                    </ListItemButton>
                  )}
                </ListItem>
              );
            })}
          </List>
        ))}
      </Box>
    </>
  );
}

/* Shared by the linked item and the disabled ones, so the row they sit in is
 * the same shape whether or not there is a page behind it. The page you are
 * on is a teal pill -- the charts' third series -- written in the card's ink,
 * because white on that teal is under the contrast text needs. */
const itemStyle: SxProps<Theme> = {
  borderRadius: 999,
  paddingBlock: "0.55rem",
  paddingInline: "0.9rem",
  color: (theme) => theme.palette.brand.railInk,
  "&:hover": { backgroundColor: (theme) => theme.palette.brand.railActive },
  "&.Mui-disabled": { opacity: 0.62 },
  '&[data-status="active"]': {
    color: (theme) => theme.palette.brand.railSelectedInk,
    backgroundColor: (theme) => theme.palette.brand.railSelected,
    "&:hover": {
      backgroundColor: (theme) => theme.palette.brand.railSelected,
    },
  },
};

export function AppSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* One set of paper styles for both drawers: the accent itself, square at
   * the edge it is fixed to, and no border where the field would show. The
   * rail scrolls rather than clipping when three groups and a profile do not
   * fit a short window. */
  const paper: SxProps<Theme> = {
    width: RAIL_WIDTH,
    border: "none",
    backgroundImage: (theme) => theme.palette.brand.rail,
    color: "common.white",
    overflowY: "auto",
  };

  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": paper,
        }}
      >
        <RailContents onNavigate={onClose} />
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          width: RAIL_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": paper,
        }}
      >
        <RailContents onNavigate={onClose} />
      </Drawer>
    </>
  );
}
