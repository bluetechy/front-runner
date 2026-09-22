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
import CustomersIcon from "@/shared/icons/CustomersIcon";
import DashboardIcon from "@/shared/icons/DashboardIcon";
import type IconProps from "@/shared/icons/IconProps";
import KpiIcon from "@/shared/icons/KpiIcon";
import OperationsIcon from "@/shared/icons/OperationsIcon";
import ProductsIcon from "@/shared/icons/ProductsIcon";
import PromotionsIcon from "@/shared/icons/PromotionsIcon";
import RevenueIcon from "@/shared/icons/RevenueIcon";
import StoresIcon from "@/shared/icons/StoresIcon";
import SupportIcon from "@/shared/icons/SupportIcon";

/*
 * The rail down the left edge of the application. It is fixed there rather
 * than floated on the field -- the mock-up insets it, and the ask was for it
 * to meet the edge -- so from `lg` up it is a permanent drawer taking its own
 * column out of the flow, and below that a temporary one the top bar's
 * hamburger opens over the page.
 *
 * Dashboard is the only item with a route behind it. The rest name the
 * sections this product is going to have, and are disabled until they exist,
 * because a link that goes nowhere is worse than one that says so.
 */

export const RAIL_WIDTH = 258;

interface NavItem {
  label: string;
  icon: FC<IconProps>;
  to?: "/dashboard";
}

const navItems: readonly NavItem[] = [
  { label: "Dashboard", icon: DashboardIcon, to: "/dashboard" },
  { label: "Sales and Revenue", icon: RevenueIcon },
  { label: "KPIs", icon: KpiIcon },
  { label: "Customers", icon: CustomersIcon },
  { label: "Products", icon: ProductsIcon },
  { label: "Stores", icon: StoresIcon },
  { label: "Promotions", icon: PromotionsIcon },
  { label: "Operations", icon: OperationsIcon },
  { label: "Help & Support", icon: SupportIcon },
];

function RailContents({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <Stack
        component={Link}
        to="/dashboard"
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1.25,
          padding: "1.75rem 1.5rem 1.5rem",
          textDecoration: "none",
          color: "common.white",
        }}
      >
        <KpiIcon size={26} />
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

      <List
        component="nav"
        aria-label="Application"
        sx={{ paddingInline: "0.9rem" }}
      >
        {navItems.map((item) => {
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
    </>
  );
}

/* Shared by the linked item and the disabled ones, so the row they sit in is
 * the same shape whether or not there is a page behind it. */
const itemStyle: SxProps<Theme> = {
  borderRadius: 999,
  paddingBlock: "0.6rem",
  paddingInline: "0.9rem",
  color: (theme) => theme.palette.brand.railInk,
  "&:hover": { backgroundColor: (theme) => theme.palette.brand.railActive },
  "&.Mui-disabled": { opacity: 0.62 },
  '&[data-status="active"]': {
    color: "common.white",
    backgroundColor: (theme) => theme.palette.brand.railActive,
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
   * the edge it is fixed to, and no border where the field would show. */
  const paper: SxProps<Theme> = {
    width: RAIL_WIDTH,
    border: "none",
    backgroundImage: (theme) => theme.palette.brand.rail,
    color: "common.white",
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
