import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BellIcon from "@/shared/icons/BellIcon";
import { MorePlease } from "./more-please";
import { NotificationFilters } from "./notification-filter";
import { NotificationRow } from "./notification-row";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotifications,
  type NotificationFilter,
} from "./notifications-api";

/*
 * The bell in the top bar, and everything behind it.
 *
 * A `Popover`, not the `Menu` the flag and the account use: this is a panel
 * with a heading, a filter, a scrolling list and a footer, and calling it a
 * menu would promise arrow-key navigation between things that are not menu
 * items. The paper is dressed to match those two regardless, because it hangs
 * off the same bar.
 *
 * The badge counts what is **unread**, and MUI drops a badge showing zero --
 * so marking everything read takes the dot off the bell without anything here
 * saying so. It is its own query and not a count of what is on screen: the
 * list is one page of a list that may be long, and switching the filter must
 * not change the number on the bell. The page reads the same query, so the
 * badge and its "Unread 6" tab are one number.
 */

/* Tall enough to show four rows and half of the fifth, which is what tells
 * somebody there is more below without a scrollbar having to appear. */
const LIST_HEIGHT = "19.5rem";

export function NotificationMenu() {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("All");

  const list = useNotifications(filter);
  const { data: counts } = useNotificationCounts();
  const unread = counts?.Unread ?? 0;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  /* The pages, flattened. Query keeps them as an array of arrays so it can
   * refetch one of them; nothing below cares which page a row came from. */
  const notifications = useMemo(
    () => list.data?.pages.flat() ?? [],
    [list.data],
  );

  return (
    <>
      <IconButton
        aria-label={
          unread > 0
            ? t("Notifications: {{unread}} unread", { unread })
            : t("Notifications")
        }
        aria-haspopup="dialog"
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: (theme) => theme.palette.brand.chromeLabel }}
      >
        <Badge badgeContent={unread} color="primary" max={99}>
          <BellIcon size={20} />
        </Badge>
      </IconButton>

      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            /* `visible` so the caret can sit outside the paper; the panel
             * inside does the clipping instead. */
            sx: {
              overflow: "visible",
              marginTop: "0.7rem",
              width: { xs: "calc(100vw - 2rem)", sm: 380 },
              maxWidth: "calc(100vw - 2rem)",
              backgroundColor: "transparent",
              backgroundImage: "none",
              boxShadow: (theme) => theme.palette.brand.panelGlow,
              /* The caret pointing back up at the bell: a square turned
               * forty-five degrees, in the same gradient as the heading it
               * grows out of. */
              "&::before": {
                content: '""',
                position: "absolute",
                top: -5,
                right: 18,
                width: 12,
                height: 12,
                transform: "rotate(45deg)",
                backgroundImage: (theme) => theme.palette.brand.buttonGradient,
              },
            },
          },
        }}
      >
        <Box
          sx={{
            overflow: "hidden",
            /* The theme's own radius, which is what every other surface in
             * this app is cut to. */
            borderRadius: 1,
            backgroundColor: (theme) => theme.palette.brand.card,
            border: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
            color: (theme) => theme.palette.brand.cardInk,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              padding: "1rem 1.1rem",
              backgroundImage: (theme) => theme.palette.brand.buttonGradient,
              color: "common.white",
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="h2"
                sx={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}
              >
                {t("Notifications")}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", opacity: 0.85 }}>
                {unreadSentence(t, unread)}
              </Typography>
            </Box>

            <Button
              size="small"
              onClick={() => markAllRead.mutate(undefined)}
              disabled={unread === 0 || markAllRead.isPending}
              sx={{
                flex: "0 0 auto",
                padding: "0.35rem 0.85rem",
                fontSize: "0.78rem",
                backgroundColor: (theme) => theme.palette.brand.card,
                color: (theme) => theme.palette.brand.cardInk,
                /* The colour has to be repeated here: the theme paints a text
                 * button white on hover, which is what it should be on the
                 * field and is invisible on this button's own paper. */
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.brand.card,
                  color: (theme) => theme.palette.brand.cardInk,
                },
                /* Nothing unread is nothing to do, so it greys out rather
                 * than disappearing: the heading keeps its shape as the last
                 * row is read, and the control stays where somebody left it.
                 * The two whites are the theme's `onAccent` pair -- what
                 * this app writes on a surface painted in the accent, which
                 * is what this heading is. */
                "&.Mui-disabled": {
                  backgroundColor: (theme) => theme.palette.brand.onAccentWash,
                  color: (theme) => theme.palette.brand.onAccentLabel,
                },
              }}
            >
              {t("Mark all read")}
            </Button>
          </Box>

          <Box
            sx={{
              padding: "0.6rem 0.75rem",
              borderBottom: (theme) =>
                `1px solid ${theme.palette.brand.cardRule}`,
            }}
          >
            <NotificationFilters filter={filter} onChange={setFilter} />
          </Box>

          <Box sx={{ maxHeight: LIST_HEIGHT, overflowY: "auto" }}>
            {list.isPending ? (
              <Message>{t("Loading your notifications…")}</Message>
            ) : list.isError ? (
              <Message>
                {list.error instanceof Error
                  ? list.error.message
                  : t("Your notifications could not be loaded.")}
              </Message>
            ) : notifications.length === 0 ? (
              <Message>{emptySentence(t, filter)}</Message>
            ) : (
              <>
                <List disablePadding>
                  {notifications.map((notification) => (
                    <NotificationRow
                      key={notification.NotificationUUID}
                      notification={notification}
                      onRead={(notificationId) =>
                        markRead.mutate(notificationId)
                      }
                    />
                  ))}
                </List>
                <MorePlease
                  hasMore={list.hasNextPage}
                  busy={list.isFetchingNextPage}
                  onReached={() => void list.fetchNextPage()}
                />
              </>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              padding: "0.6rem",
              borderTop: (theme) => `1px solid ${theme.palette.brand.cardRule}`,
              backgroundColor: (theme) => theme.palette.brand.cardField,
            }}
          >
            <Button
              component={Link}
              to="/notifications"
              onClick={() => setAnchor(null)}
              sx={{
                padding: "0.25rem 0.75rem",
                fontSize: "0.8rem",
                fontStyle: "normal",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "primary.main",
                /* Darker rather than the theme's white, which on this
                 * footer's grey is the link disappearing under the cursor. */
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "primary.dark",
                },
              }}
            >
              {t("View all")}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

/*
 * The line under the heading. Three sentences rather than one with a plural
 * rule in it: the keys in `locales/*.json` are the English sentence itself,
 * so a key carrying i18next's `_one`/`_other` suffix would no longer be the
 * sentence it stands for. See `language/i18n.ts`.
 */
function unreadSentence(t: TFunction, unread: number): string {
  if (unread === 0) return t("You are all caught up.");
  if (unread === 1) return t("You have 1 unread notification.");
  return t("You have {{unread}} unread notifications.", { unread });
}

/* An empty list means something different under each filter, and "you have no
 * notifications yet" under Unread would be a lie told to somebody who has
 * forty of them. */
function emptySentence(t: TFunction, filter: NotificationFilter): string {
  if (filter === "Unread") return t("Nothing unread.");
  if (filter === "Read") return t("Nothing read yet.");
  return t("You have no notifications yet.");
}

/* Whatever the list has to say when it is not a list: waiting, broken, or
 * empty. One component so all three sit in the same place, at the same size,
 * and the panel does not change shape between them. */
function Message({ children }: { children: string }) {
  return (
    <Typography
      sx={{
        padding: "2.25rem 1.25rem",
        textAlign: "center",
        fontSize: "0.87rem",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}
