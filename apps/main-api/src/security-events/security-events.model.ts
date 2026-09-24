import { Field, GraphQLISODateTime, ID, ObjectType } from "@nestjs/graphql";

// One thing that happened to an account: a login, an address added, a password
// changed.
//
// A different subject from dbo.EventLog, which is what happens inside an
// organization, and a different table for that reason -- see
// apps/main-db/sql/Tables/SecurityEvents.sql. There is no organization on it:
// an account is one account however many organizations it belongs to, and a
// login is not any of their business.
@ObjectType()
export class SecurityEvent {
  @Field(() => ID)
  SecurityEventUUID!: string;
  // "LoginSucceeded", "EmailAdded", "PasswordChanged", and whatever the product
  // comes to record. Free text in the column rather than an enum, for the
  // reason Notification's type is: the list grows, and a browser older than the
  // API has to draw something sensible for a type it has not met.
  @Field(() => String)
  EventType!: string;
  // The sentence the page shows. Written when the event is recorded rather than
  // composed from the type here, because the sentence knows things the type
  // does not: which address, which device.
  @Field(() => String)
  Description!: string;
  // What a login knows and an email change does not. Null on most rows, and the
  // dialog leaves out whichever is missing rather than printing "Unknown".
  @Field(() => String, { nullable: true })
  Device!: string | null;
  // Coarse on purpose -- "Utah, USA". Somebody has to recognize themselves in
  // it, which a city and a street do not help with and a thief would be glad of.
  @Field(() => String, { nullable: true })
  Location!: string | null;
  @Field(() => GraphQLISODateTime)
  OccurredAt!: Date;
  // Null until the question on the page is answered, which is what puts the New
  // mark on a row.
  @Field(() => GraphQLISODateTime, { nullable: true })
  ReviewedAt!: Date | null;
  // What was said: true is "yes, it was me". Null together with ReviewedAt, and
  // the database has a CHECK that keeps them that way.
  @Field(() => Boolean, { nullable: true })
  Recognized!: boolean | null;
}
