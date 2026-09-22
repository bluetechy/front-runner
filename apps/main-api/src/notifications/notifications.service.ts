import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { Notification } from "./notifications.model.js";

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  // Everything the account has been told, newest first, read and unread in one
  // list. No row limit is passed: the browser counts the unread ones in what
  // comes back to put a number on the bell, and a cap here would be a badge
  // that says 50 when there are 60. The cap and a second page arrive together
  // or not at all -- dbo.GetNotifications already takes one.
  list(loginName: string) {
    return this.db.query<Notification>(
      'SELECT * FROM dbo."GetNotifications"($1)',
      [loginName],
    );
  }

  // Both writes answer with the whole list, the way the wallet's do: the
  // caller is a menu with a count on it, so a single row would leave it to
  // work out what the count is now.
  //
  // The login name is the token's, never the caller's, so neither of these can
  // reach into somebody else's notifications by naming one. The database
  // checks ownership again regardless, and answers a notification that is not
  // yours the same way it answers one that does not exist.
  markRead(loginName: string, notificationId: string) {
    return this.db.query<Notification>(
      'SELECT * FROM dbo."MarkNotificationRead"($1, $2)',
      [loginName, notificationId],
    );
  }

  markAllRead(loginName: string) {
    return this.db.query<Notification>(
      'SELECT * FROM dbo."MarkAllNotificationsRead"($1)',
      [loginName],
    );
  }
}
