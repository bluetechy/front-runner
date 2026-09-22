import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { Notification } from "./notifications.model.js";
import { NotificationsService } from "./notifications.service.js";

// Your own notifications, and nothing else. None of these takes a user: the
// login name comes from the verified token, so there is no way to name
// somebody else's bell, and no authorization question beyond being signed in.
//
// Both mutations return the whole list rather than the row they touched,
// because the caller is a menu with an unread count on it. See the service.
@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private readonly service: NotificationsService) {}

  @Query(() => [Notification])
  notifications(@CurrentUser() user: Principal) {
    return this.service.list(user.loginName);
  }

  @Mutation(() => [Notification])
  markNotificationRead(
    @CurrentUser() user: Principal,
    @Args("notificationId", { type: () => String }, new ParseUUIDPipe())
    notificationId: string,
  ) {
    return this.service.markRead(user.loginName, notificationId);
  }

  @Mutation(() => [Notification])
  markAllNotificationsRead(@CurrentUser() user: Principal) {
    return this.service.markAllRead(user.loginName);
  }
}
