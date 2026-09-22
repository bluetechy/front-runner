import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CardSurface } from "../card-surface";
import { MorePlease } from "./more-please";
import { NotificationFilters } from "./notification-filter";
import { NotificationItem } from "./notification-item";
import {
  NO_COUNTS,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotifications,
  type NotificationFilter,
} from "./notifications-api";

/*
 * The notifications page, at /notifications, which is where the bell's
 * "View all" goes.
 *
 * The same list as the panel and a different reading of it: the panel is a
 * glance somebody takes with the page they were on still behind it, and this
 * is where they go to work through the whole thing. So it has the panel's
 * filter and the panel's paging -- the same hooks, the same query keys, the
 * same cache, so a notification read in one is read in the other without
 * either being told -- and it spends the room a page has on what the panel
 * cannot fit: a chip saying what kind of thing each one is, a larger face, a
 * count beside each filter, and the action written out as a control.
 *
 * It is one card on the field, the way every page behind the login is. See
 * docs/notifications.md.
 */
export function NotificationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NotificationFilter>("All");

  const list = useNotifications(filter);
  const { data: counts = NO_COUNTS } = useNotificationCounts();
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
        <Box>
          <Typography
            variant="h2"
            sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
          >
            {t("Notifications")}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem" }}>
            {unreadSentence(t, counts.Unread)}
          </Typography>
        </Box>

        {/* Nothing unread is nothing to do, so it greys out rather than
         * disappearing -- the heading keeps its shape as the last row is
         * read. This one is on the field rather than on card paper, so it is
         * the app's ordinary contained button. */}
        <Button
          variant="contained"
          onClick={() => markAllRead.mutate(undefined)}
          disabled={counts.Unread === 0 || markAllRead.isPending}
        >
          {t("Mark all read")}
        </Button>
      </Stack>

      <CardSurface>
        <Box sx={{ maxWidth: 420, marginBottom: 1.5 }}>
          <NotificationFilters
            filter={filter}
            onChange={setFilter}
            counts={counts}
          />
        </Box>

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
            {/* The rows reach the card's edges, the way a list on paper does,
             * rather than sitting inside its padding with a gutter either
             * side of every rule. */}
            <Box
              component="ul"
              sx={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                marginInline: { xs: "-1.25rem", sm: "-1.5rem" },
              }}
            >
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.NotificationUUID}
                  notification={notification}
                  busy={markRead.isPending}
                  onRead={(notificationId) => markRead.mutate(notificationId)}
                />
              ))}
            </Box>
            <MorePlease
              hasMore={list.hasNextPage}
              busy={list.isFetchingNextPage}
              onReached={() => void list.fetchNextPage()}
            />
          </>
        )}
      </CardSurface>
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
 * and the card does not change shape between them. */
function Message({ children }: { children: string }) {
  return (
    <Typography
      sx={{
        padding: "3.5rem 1.25rem",
        textAlign: "center",
        fontSize: "0.92rem",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}
