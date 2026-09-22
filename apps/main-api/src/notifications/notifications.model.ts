import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";

// Something the signed-in person has been told about.
//
// "ReadAt" is the whole of the read/unread question: null is a notification
// nobody has seen yet, and a timestamp is when they did. There is no IsRead
// beside it -- one column cannot disagree with itself, and a reader wanting a
// boolean has `ReadAt === null` in front of it. See
// apps/main-db/sql/Tables/Notifications.sql.

// Which of them to hand back. An enum rather than a boolean, because "all of
// them" is a third answer and not the absence of the first two.
export enum NotificationFilter {
  All = "All",
  Read = "Read",
  Unread = "Unread",
}
registerEnumType(NotificationFilter, { name: "NotificationFilter" });

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
  // Who caused it, as against who is being told. Null wherever nobody did --
  // a task falls overdue on its own, a level is reached by the person being
  // told, an update ships. Both actor fields are null together.
  @Field(() => ID, { nullable: true })
  ActorUUID!: string | null;
  // Joined rather than left to the caller to look up: everything that wants
  // an actor wants their name, and the browser draws them as the face on the
  // row. A disabled account is still who did it.
  @Field(() => String, { nullable: true })
  ActorName!: string | null;
  // What happened -- "Assigned", "BadgeEarned", "OrderReceived". Free text in
  // the column rather than an enum, because the list of things worth telling
  // somebody grows with the product; the browser picks an icon from it and
  // falls back to a general one for a type it has not met.
  @Field(() => String)
  NotificationType!: string;
  // The sentence shown in the menu. Written when the notification is made,
  // not composed from the type here. On a notification that has an actor it
  // is a phrase read after their name -- "assigned you Build the API."
  @Field(() => String)
  Message!: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  ReadAt!: Date | null;
  @Field(() => GraphQLISODateTime)
  CreatedAt!: Date;
}

// How many there are, under each of the three filters. One object rather than
// three fields, because the page showing them shows all three at once and the
// bell wants one of them -- so both read the same count, taken in one pass over
// the table, and cannot disagree about what is unread.
//
// `All` is `Read + Unread` by construction. It is returned rather than left to
// the caller to add up, because a caller that added it up would be doing so
// across two numbers that may have been counted at different moments.
@ObjectType()
export class NotificationCounts {
  @Field(() => Int)
  All!: number;
  @Field(() => Int)
  Unread!: number;
  @Field(() => Int)
  Read!: number;
}
