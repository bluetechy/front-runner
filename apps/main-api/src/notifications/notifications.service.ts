import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import {
  Notification,
  NotificationCounts,
  NotificationFilter,
} from "./notifications.model.js";

// Which rows a filter asks for. Keyed by the enum rather than built from what
// arrived, so what reaches the query is one of exactly three strings written
// here; GraphQL refuses anything that is not one of the three before this is
// reached.
const OF: Record<NotificationFilter, string> = {
  [NotificationFilter.All]: "",
  [NotificationFilter.Read]: 'WHERE "Notifications"."ReadAt" IS NOT NULL',
  [NotificationFilter.Unread]: 'WHERE "Notifications"."ReadAt" IS NULL',
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  // One page of the account's notifications, newest first. The filter and the
  // page are applied around dbo.GetNotifications rather than inside it, which
  // is how `users` pages dbo.GetUsers: the function stays the one place that
  // says what a notification is and who may see it.
  //
  // The ORDER BY is restated here because a set-returning function's order is
  // not something a wrapping SELECT is required to keep, and a page boundary
  // landing in a list that sorted differently each call would show one row
  // twice and skip another.
  list(loginName: string, filter: NotificationFilter, page: PageArgs) {
    return this.db.query<Notification>(
      `SELECT * FROM dbo."GetNotifications"($1) AS "Notifications" ${OF[filter]}
       ORDER BY "Notifications"."CreatedAt" DESC, "Notifications"."NotificationUUID"
       LIMIT $2 OFFSET $3`,
      [loginName, page.limit, page.offset],
    );
  }

  // The numbers beside the filters, and the number on the bell.
  //
  // Counting is its own read because the list is paged: counting the unread
  // rows in a page would say "six" when the first page happens to hold six of
  // forty. All three come back together, from one pass over the table, so the
  // tab that says "Unread 6" and the badge that says 6 cannot disagree.
  async counts(loginName: string) {
    const [counted] = await this.db.query<NotificationCounts>(
      `SELECT count(*)::int AS "All",
              count(*) FILTER (WHERE "Notifications"."ReadAt" IS NULL)::int AS "Unread",
              count(*) FILTER (WHERE "Notifications"."ReadAt" IS NOT NULL)::int AS "Read"
       FROM dbo."GetNotifications"($1) AS "Notifications"`,
      [loginName],
    );
    // An account with nothing has three noughts rather than no answer: the
    // page draws its tabs from this before it knows whether there is anything
    // to put under them.
    return counted ?? { All: 0, Unread: 0, Read: 0 };
  }

  // Marking one read answers with that row, and marking everything read
  // answers with how many rows that was. Neither answers with the list: the
  // caller is holding a page of it, and a mutation returning a different
  // number of rows than is on screen is worse than one returning what changed.
  //
  // The login name is the token's, never the caller's, so neither of these can
  // reach into somebody else's notifications by naming one. The database
  // checks ownership again regardless, and answers a notification that is not
  // yours the same way it answers one that does not exist.
  async markRead(loginName: string, notificationId: string) {
    const [marked] = await this.db.query<Notification>(
      'SELECT * FROM dbo."MarkNotificationRead"($1, $2)',
      [loginName, notificationId],
    );
    return marked ?? null;
  }

  async markAllRead(loginName: string) {
    const [marked] = await this.db.query<{ MarkAllNotificationsRead: number }>(
      'SELECT dbo."MarkAllNotificationsRead"($1)',
      [loginName],
    );
    return marked?.MarkAllNotificationsRead ?? 0;
  }
}
