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
import { useTranslation } from "react-i18next";
import AchievementsIcon from "@/shared/icons/AchievementsIcon";
import BillingIcon from "@/shared/icons/BillingIcon";
import CertificationsIcon from "@/shared/icons/CertificationsIcon";
import CustomerServiceIcon from "@/shared/icons/CustomerServiceIcon";
import DashboardIcon from "@/shared/icons/DashboardIcon";
import type IconProps from "@/shared/icons/IconProps";
import KpiIcon from "@/shared/icons/KpiIcon";
import ProfileIcon from "@/shared/icons/ProfileIcon";
import ScheduleIcon from "@/shared/icons/ScheduleIcon";
import SecurityIcon from "@/shared/icons/SecurityIcon";
import SettingsIcon from "@/shared/icons/SettingsIcon";
import TutorialsIcon from "@/shared/icons/TutorialsIcon";
import WalletIcon from "@/shared/icons/WalletIcon";
import { useSession } from "../authentication";
import { InitialsAvatar } from "../avatar";
import { useProfile } from "../profile";

/*
 * The rail down the left edge of the application. It is fixed there rather
 * than floated on the field -- the mock-up insets it, and the ask was for it
 * to meet the edge -- so from `lg` up it is a permanent drawer taking its own
 * column out of the flow, and below that a temporary one the top bar's
 * hamburger opens over the page.
 *
 * It is painted in the chrome, which is the field's own violet: see
 * `design-system/theme.ts` and docs/style-guide.md for why the rail stopped
 * being the accent and what is left wearing it.
 *
 * The logo, whoever is signed in, and then the nav in three named groups.
 * Every item is a route: Command Center is this dashboard, and the other
 * ten are pages that say plainly they have not been built yet. Selecting
 * one is a navigation, so the URL, the back button and the pill under the
 * item you are on all agree without any of them being told twice.
 */

export const RAIL_WIDTH = 258;

/* Every page behind the login. Spelled out rather than left as `string`, so
 * a link to a route that does not exist is a failed build rather than a dead
 * item in the rail. */
type AppPath =
  | "/dashboard"
  | "/schedule"
  | "/achievements"
  | "/certifications"
  | "/profile"
  | "/security"
  | "/billing"
  | "/wallet"
  | "/settings"
  | "/tutorials"
  | "/customer-service";

/* `label` is the English sentence and the translation key both -- see
 * `language/i18n.ts` -- so it stays untranslated in here and goes through
 * `t()` where it is drawn. It is also the React key, which is the other
 * reason it must not change with the language. */
interface NavItem {
  label: string;
  icon: FC<IconProps>;
  to: AppPath;
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
      { label: "Schedule", icon: ScheduleIcon, to: "/schedule" },
      { label: "Achievements", icon: AchievementsIcon, to: "/achievements" },
      {
        label: "Certifications",
        icon: CertificationsIcon,
        to: "/certifications",
      },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", icon: ProfileIcon, to: "/profile" },
      { label: "Security & Login", icon: SecurityIcon, to: "/security" },
      { label: "Billing & Subscription", icon: BillingIcon, to: "/billing" },
      { label: "Payment Wallet", icon: WalletIcon, to: "/wallet" },
      { label: "Settings", icon: SettingsIcon, to: "/settings" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tutorials", icon: TutorialsIcon, to: "/tutorials" },
      {
        label: "Customer Service",
        icon: CustomerServiceIcon,
        to: "/customer-service",
      },
    ],
  },
];

function RailContents({ onNavigate }: { onNavigate: () => void }) {
  const { identity } = useSession();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const name = identity?.name ?? "—";

  return (
    <>
      <Stack
        component={Link}
        to="/dashboard"
        direction="row"
        sx={{
          flexShrink: 0,
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
      <Stack
        sx={{ flexShrink: 0, alignItems: "center", paddingInline: "1.5rem" }}
      >
        <InitialsAvatar
          name={name}
          size={68}
          fontSize="1.4rem"
          sx={{
            border: (theme) => `3px solid ${theme.palette.brand.chromeEdge}`,
          }}
        />
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
            minHeight: "1.2rem",
            fontSize: "0.78rem",
            color: (theme) => theme.palette.brand.chromeLabel,
          }}
        >
          {/* What they are here as, from their profile. Blank until they
           * fill it in, rather than a title invented for them. */}
          {profile?.Designation ?? ""}
        </Typography>
      </Stack>

      <Divider
        sx={{
          flexShrink: 0,
          mt: 2,
          marginInline: "1.4rem",
          borderColor: (theme) => theme.palette.brand.chromeEdge,
        }}
      />

      {/* Only the nav scrolls. The logo and whoever is signed in are above
       * it and stay where they are, however many groups this grows to. */}
      <Box
        component="nav"
        aria-label={t("Application")}
        sx={{
          flex: 1,
          /* Without this a flex child refuses to shrink below its content,
           * and the rail scrolls as a whole instead of the nav inside it. */
          minHeight: 0,
          overflowY: "auto",
          paddingBottom: 2,
          scrollbarWidth: "thin",
          scrollbarColor: (theme) =>
            `${theme.palette.brand.chromeEdge} transparent`,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 999,
            backgroundColor: (theme) => theme.palette.brand.chromeEdge,
          },
        }}
      >
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
                  color: (theme) => theme.palette.brand.chromeLabel,
                }}
              >
                {t(group.label)}
              </Typography>
            }
            sx={{ paddingInline: "0.9rem", paddingBlock: "0.9rem 0" }}
          >
            {group.items.map((item) => {
              const ItemIcon = item.icon;

              return (
                <ListItem
                  key={item.label}
                  disablePadding
                  sx={{ marginBottom: 0.25 }}
                >
                  <ListItemButton
                    component={Link}
                    to={item.to}
                    activeOptions={{ exact: true }}
                    onClick={onNavigate}
                    sx={itemStyle}
                  >
                    <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
                      <ItemIcon size={20} />
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.label)}
                      slotProps={{
                        primary: {
                          sx: { fontSize: "0.92rem", fontWeight: 500 },
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ))}
      </Box>
    </>
  );
}

/* The page you are on is a pill in the accent's fade, lit the way a contained
 * button is: on a rail that is now the same violet as the field, the one
 * coloured thing left in the chrome is where you are. TanStack Router marks
 * the item for us. */
const itemStyle: SxProps<Theme> = {
  borderRadius: 999,
  paddingBlock: "0.55rem",
  paddingInline: "0.9rem",
  color: (theme) => theme.palette.brand.chromeInk,
  transition: "background-color 150ms ease",
  "&:hover": { backgroundColor: (theme) => theme.palette.brand.chromeHover },
  '&[data-status="active"]': {
    color: (theme) => theme.palette.brand.chromeSelectedInk,
    backgroundImage: (theme) => theme.palette.brand.chromeSelected,
    boxShadow: "0 10px 24px rgba(209, 37, 143, 0.3)",
    "&:hover": {
      backgroundColor: "transparent",
      backgroundImage: (theme) => theme.palette.brand.chromeSelected,
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
  /* One set of paper styles for both drawers: the chrome, square at the edge
   * it is fixed to, and a hairline down the side the field is on -- the rail
   * and the field are close enough in colour now that without it the two run
   * together. A column, because the nav below the profile is the part that
   * scrolls. */
  const paper: SxProps<Theme> = {
    width: RAIL_WIDTH,
    border: "none",
    borderRight: (theme) => `1px solid ${theme.palette.brand.chromeEdge}`,
    backgroundImage: (theme) => theme.palette.brand.chromeRail,
    color: "common.white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
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
