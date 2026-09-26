import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useSession } from "../authentication";
import { useGraphql } from "../graphql";

/*
 * The signed-in person's notifications, a page at a time, and the two ways of
 * marking them read.
 *
 * This is the first thing in the app to go through TanStack Query rather than
 * a `useEffect` and a `useState` the way `profile-api` and `wallet-api` do.
 * The bell is what made it worth it: the panel is opened and closed over and
 * over, it pages as somebody scrolls, and marking one read has to move a count
 * in the top bar as well as a row inside the panel. Query gives that the
 * cache, the paging and the one invalidation that replaces all of it.
 *
 * The counts are their own query rather than something counted in the list,
 * because the list is a page of it: counting the unread rows on screen would
 * say six when the first page happens to hold six of forty. All three come
 * back together, so the bell's badge and the page's "Unread 6" tab are the
 * same number read once.
 */

/* Every field of a notification, in one place: the query and the mutation ask
 * for the same selection, so a field added to one is added once here. */
const NOTIFICATION_FIELDS = `NotificationUUID OrganizationUUID TaskUUID
  ActorUUID ActorName NotificationType Message ReadAt CreatedAt`;

const READ = `query Notifications($filter: NotificationFilter!, $limit: Int!, $offset: Int!) {
  notifications(filter: $filter, limit: $limit, offset: $offset) { ${NOTIFICATION_FIELDS} }
}`;

const COUNTS = `query NotificationCounts { notificationCounts { All Unread Read } }`;

const MARK_READ = `mutation MarkNotificationRead($notificationId: String!) {
  markNotificationRead(notificationId: $notificationId) { ${NOTIFICATION_FIELDS} }
}`;

const MARK_ALL_READ = `mutation MarkAllNotificationsRead { markAllNotificationsRead }`;

/*
 * A page. Twelve is about three times what the panel shows at once, which is
 * what makes the scroll look continuous: the next page is asked for while the
 * person is still reading the middle of this one, so it has landed before
 * they reach the end. See `PAGE_AHEAD` in `notification-menu`.
 */
export const PAGE_SIZE = 12;

/* One root key for everything in this vertical, so a mutation invalidating it
 * reaches the list under every filter and the count beside them. */
const NOTIFICATIONS = ["notifications"] as const;

export type NotificationFilter = "All" | "Read" | "Unread";

/* How many there are under each filter. `All` is `Read + Unread`, and is
 * counted rather than added up here: adding it up would mean trusting two
 * numbers taken at two moments. */
export type NotificationCounts = Record<NotificationFilter, number>;

export const NO_COUNTS: NotificationCounts = { All: 0, Unread: 0, Read: 0 };

/* The order the two filter strips draw them in, and the only place it is
 * written: the panel and the page both map over this. */
export const FILTERS: readonly NotificationFilter[] = ["All", "Read", "Unread"];

/*
 * One notification. `ReadAt` is the whole of the read/unread question: null is
 * one nobody has seen, and a timestamp is when they did. There is no `IsRead`
 * beside it -- one field cannot disagree with itself.
 */
export interface Notification {
  NotificationUUID: string;
  OrganizationUUID: string;
  /* Null unless it is about a task, which most of them are not. */
  TaskUUID: string | null;
  /* Who caused it, as against who is being told. Null wherever nobody did --
   * a task falls overdue on its own, an update ships. Both actor fields are
   * null together, and the row draws its own icon instead of a face. */
  ActorUUID: string | null;
  ActorName: string | null;
  /* "Assigned", "BadgeEarned", "OrderReceived", and whatever the product
   * comes to send. `notification-kinds` turns it into an icon, and has an
   * answer for a type it has not met. */
  NotificationType: string;
  /* On a notification with an actor this is read after their name --
   * "assigned you Build the API." */
  Message: string;
  ReadAt: string | null;
  CreatedAt: string;
}

export function isUnread(notification: Notification): boolean {
  return notification.ReadAt === null;
}

/* What to say if the API answers with neither data nor an error, which is a
 * shape rather than a message: the sentence belongs to whoever asked. */
const NOTHING_CAME_BACK = "The API returned no notifications.";

/*
 * The list, a page at a time.
 *
 * Offset paging rather than a cursor, which is what `users` and
 * `organizations` already do. The order is stable down to the tie-break --
 * `CreatedAt` then the UUID -- so a page boundary cannot show one row twice;
 * what offsets cannot do is stay correct if a notification arrives *while*
 * somebody is scrolling, and the answer to that is the same as everywhere
 * else: the next invalidation puts it right.
 *
 * A short page is the end of the list. There is no total to compare against
 * and there does not need to be one: asking for twelve and getting nine means
 * there is no thirteenth.
 */
export function useNotifications(filter: NotificationFilter) {
  const call = useGraphql();
  const { status } = useSession();

  return useInfiniteQuery({
    queryKey: [...NOTIFICATIONS, "list", filter],
    queryFn: ({ pageParam }) =>
      call<Notification[]>(
        READ,
        { filter, limit: PAGE_SIZE, offset: pageParam },
        NOTHING_CAME_BACK,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PAGE_SIZE
        ? undefined
        : pages.reduce((total, page) => total + page.length, 0),
    /* Nothing to ask for until there is a token to ask with. The `_app`
     * route sends a signed-out visitor back to the landing page, so this is
     * the moment before the session has settled rather than a state the bell
     * sits in. */
    enabled: status === "signed-in",
    /* A notification is not urgent: half a minute of staleness means opening
     * and closing the panel does not re-ask, and a refetch when the window
     * comes back to the front catches up. */
    staleTime: 30_000,
  });
}

/* How many there are under each filter: the number on the badge, and the
 * numbers beside the tabs. Separate from the list, and deliberately not
 * derived from it -- the list is a page, and switching the filter must not
 * change the number on the bell.
 *
 * One key, so the bell and the page share one request and cannot disagree. */
export function useNotificationCounts() {
  const call = useGraphql();
  const { status } = useSession();

  return useQuery({
    queryKey: [...NOTIFICATIONS, "counts"],
    queryFn: () => call<NotificationCounts>(COUNTS, {}, NOTHING_CAME_BACK),
    enabled: status === "signed-in",
    staleTime: 30_000,
  });
}

/* Both writes change what the badge says and what the Unread filter holds, so
 * both invalidate everything under the root key rather than trying to patch a
 * row into whichever pages happen to be cached. Refetching a few pages of
 * twelve costs less than a cache that is subtly wrong. */
function useNotificationMutation<Variables, Result>(
  run: (variables: Variables) => Promise<Result>,
): UseMutationResult<Result, Error, Variables> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: NOTIFICATIONS }),
  });
}

export function useMarkNotificationRead() {
  const call = useGraphql();
  return useNotificationMutation((notificationId: string) =>
    call<Notification>(MARK_READ, { notificationId }, NOTHING_CAME_BACK),
  );
}

export function useMarkAllNotificationsRead() {
  const call = useGraphql();
  return useNotificationMutation(() =>
    call<number>(MARK_ALL_READ, {}, NOTHING_CAME_BACK),
  );
}
