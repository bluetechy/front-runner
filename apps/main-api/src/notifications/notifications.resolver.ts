import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { PageArgs, PagePipe } from "../graphql/index.js";
import {
  Notification,
  NotificationCounts,
  NotificationFilter,
} from "./notifications.model.js";
import { NotificationsService } from "./notifications.service.js";

// Your own notifications, and nothing else. None of these takes a user: the
// login name comes from the verified token, so there is no way to name
// somebody else's bell, and no authorization question beyond being signed in.
//
// `notifications` is paged the way `users` is, because a bell that has been
// rung for a year is not a list anybody should be handed at once.
// `notificationCounts` is separate for that reason: the badge and the filter
// tabs count every notification, not the ones in the page on screen.
@Resolver(() => Notification)
export class NotificationsResolver {
  constructor(private readonly service: NotificationsService) {}

  @Query(() => [Notification])
  notifications(
    @CurrentUser() user: Principal,
    @Args("filter", {
      type: () => NotificationFilter,
      defaultValue: NotificationFilter.All,
    })
    filter: NotificationFilter,
    @Args(new PagePipe()) page: PageArgs,
  ) {
    return this.service.list(user.loginName, filter, page);
  }

  @Query(() => NotificationCounts)
  notificationCounts(@CurrentUser() user: Principal) {
    return this.service.counts(user.loginName);
  }

  // Null when the notification is already gone -- the row is read back after
  // the write, so a notification deleted between the two is "nothing to show"
  // rather than an error.
  @Mutation(() => Notification, { nullable: true })
  markNotificationRead(
    @CurrentUser() user: Principal,
    @Args("notificationId", { type: () => String }, new ParseUUIDPipe())
    notificationId: string,
  ) {
    return this.service.markRead(user.loginName, notificationId);
  }

  // How many were marked. Zero is an ordinary answer: the button is there
  // whether or not there is anything to do.
  @Mutation(() => Int)
  markAllNotificationsRead(@CurrentUser() user: Principal) {
    return this.service.markAllRead(user.loginName);
  }
}
