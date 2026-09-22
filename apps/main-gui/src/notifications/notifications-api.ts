import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useSession } from "../authentication";

/*
 * The signed-in person's notifications, and the two ways of marking them read.
 *
 * This is the first thing in the app to go through TanStack Query rather than
 * a `useEffect` and a `useState` the way `profile-api` and `wallet-api` do.
 * The bell is what made it worth it: the menu is opened and closed over and
 * over, several things want the same list at once, and marking one read has to
 * move a count in the top bar as well as a row inside the menu. Query gives
 * that the cache, the de-duplication and the one invalidation that replaces
 * all of it.
 *
 * Both mutations answer with the **whole list**, because both change what the
 * badge says -- so each replaces the cached list rather than patching it, and
 * nothing has to work out what else changed. The invalidation that follows is
 * the braces to that belt: another tab may have read something too.
 */

/* Every field of a notification, in one place: the query and the two
 * mutations ask for the same selection, so a field added to one is added
 * once here. */
const NOTIFICATION_FIELDS = `NotificationUUID OrganizationUUID TaskUUID
  NotificationType Message ReadAt CreatedAt`;

const READ = `query Notifications { notifications { ${NOTIFICATION_FIELDS} } }`;

const MARK_READ = `mutation MarkNotificationRead($notificationId: String!) {
  markNotificationRead(notificationId: $notificationId) { ${NOTIFICATION_FIELDS} }
}`;

const MARK_ALL_READ = `mutation MarkAllNotificationsRead {
  markAllNotificationsRead { ${NOTIFICATION_FIELDS} }
}`;

/* One key for everything in this vertical, so a mutation invalidating it
 * reaches whatever else comes to be cached under it. */
const NOTIFICATIONS = ["notifications"] as const;

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
  /* "Assigned", "BadgeEarned", "OrderReceived", and whatever the product
   * comes to send. `notification-kinds` turns it into an icon, and has an
   * answer for a type it has not met. */
  NotificationType: string;
  Message: string;
  ReadAt: string | null;
  CreatedAt: string;
}

export function isUnread(notification: Notification): boolean {
  return notification.ReadAt === null;
}

export function unreadCount(notifications: Notification[]): number {
  return notifications.filter(isUnread).length;
}

/*
 * The GraphQL call itself. A copy of the one in `profile-api` and
 * `wallet-api`, deliberately, rather than a third import: those two fetch
 * without Query and are not being rewritten here. When the second vertical
 * goes through Query, this is the point at which the three become one
 * `graphql/` vertical -- see docs/codebase-structure.md.
 */
function useGraphql() {
  const { getAccessToken } = useSession();

  return async function call<Result>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<Result> {
    const token = await getAccessToken();
    if (!token) throw new Error("Your session has expired. Sign in again.");

    const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await response.json()) as {
      data?: Record<string, Result | null>;
      errors?: { message: string }[];
    };
    /* The API answers 200 with an errors array, so the status says nothing;
     * the first message is the one worth showing. */
    if (body.errors?.length) throw new Error(body.errors[0]!.message);
    const [result] = Object.values(body.data ?? {});
    if (result === undefined || result === null)
      throw new Error("The API returned no notifications.");
    return result;
  };
}

export function useNotifications() {
  const call = useGraphql();
  const { status } = useSession();

  return useQuery({
    queryKey: NOTIFICATIONS,
    queryFn: () => call<Notification[]>(READ),
    /* Nothing to ask for until there is a token to ask with. The `_app`
     * route sends a signed-out visitor back to the landing page, so this is
     * the moment before the session has settled rather than a state the bell
     * sits in. */
    enabled: status === "signed-in",
    /* A notification is not urgent and the list is small: half a minute of
     * staleness means opening and closing the menu does not re-ask, and a
     * refetch when the window comes back to the front catches up. */
    staleTime: 30_000,
  });
}

/* Both writes answer with the whole list, so the cache is replaced from what
 * comes back and the badge is right before the refetch lands. */
function useNotificationMutation<Variables>(
  run: (variables: Variables) => Promise<Notification[]>,
): UseMutationResult<Notification[], Error, Variables> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: (notifications) => {
      client.setQueryData(NOTIFICATIONS, notifications);
      void client.invalidateQueries({ queryKey: NOTIFICATIONS });
    },
  });
}

export function useMarkNotificationRead() {
  const call = useGraphql();
  return useNotificationMutation((notificationId: string) =>
    call<Notification[]>(MARK_READ, { notificationId }),
  );
}

export function useMarkAllNotificationsRead() {
  const call = useGraphql();
  return useNotificationMutation(() => call<Notification[]>(MARK_ALL_READ));
}
