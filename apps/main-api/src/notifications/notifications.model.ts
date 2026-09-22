import { Field, GraphQLISODateTime, ID, ObjectType } from "@nestjs/graphql";

// Something the signed-in person has been told about.
//
// "ReadAt" is the whole of the read/unread question: null is a notification
// nobody has seen yet, and a timestamp is when they did. There is no IsRead
// beside it -- one column cannot disagree with itself, and a reader wanting a
// boolean has `ReadAt === null` in front of it. See
// apps/main-db/sql/Tables/Notifications.sql.
@ObjectType()
export class Notification {
  @Field(() => ID)
  NotificationUUID!: string;
  // Which organization it came out of. A notification is always somebody's,
  // inside something.
  @Field(() => ID)
  OrganizationUUID!: string;
  // Null unless it is about a task, which most of them are not: the draft
  // schema assumed every notification was one.
  @Field(() => ID, { nullable: true })
  TaskUUID!: string | null;
  // What happened -- "Assigned", "BadgeEarned", "OrderReceived". Free text in
  // the column rather than an enum, because the list of things worth telling
  // somebody grows with the product; the browser picks an icon from it and
  // falls back to a general one for a type it has not met.
  @Field(() => String)
  NotificationType!: string;
  // The sentence shown in the menu. Written when the notification is made,
  // not composed from the type here.
  @Field(() => String)
  Message!: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  ReadAt!: Date | null;
  @Field(() => GraphQLISODateTime)
  CreatedAt!: Date;
}
