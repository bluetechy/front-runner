import { Field, InputType, ObjectType, ID } from "@nestjs/graphql";

// The profile page's fields, one object for reading and one for writing.
//
// Nothing Keycloak owns is in either of them. "Name", "LoginName" and "Email"
// live on User and are refreshed from the token on every sign-in, so a
// profile write that touched them would last until the next one -- see
// apps/main-db/sql/Tables/UserProfiles.sql.
//
// Every text field is a string rather than a nullable one: an unanswered
// field and a field answered with nothing are the same thing here, and the
// column is NOT NULL DEFAULT '' for the same reason.
@ObjectType()
export class UserProfile {
  @Field(() => ID)
  UserUUID!: string;
  @Field(() => String)
  FirstName!: string;
  @Field(() => String)
  LastName!: string;
  @Field(() => String)
  NickName!: string;
  @Field(() => String)
  Designation!: string;
  @Field(() => String)
  Biography!: string;
  @Field(() => String)
  Language!: string;
  @Field(() => String)
  Gender!: string;
  // A day, as "1990-04-17", and null when nobody has given one. A String
  // rather than GraphQLISODateTime on purpose: a date that becomes a
  // timestamp is midnight somewhere, and the day before that somewhere else.
  @Field(() => String, { nullable: true })
  BirthDate!: string | null;
  @Field(() => String)
  Phone!: string;
  @Field(() => String)
  Address!: string;
  @Field(() => String)
  Twitter!: string;
  @Field(() => String)
  Facebook!: string;
  @Field(() => String)
  LinkedIn!: string;
  @Field(() => String)
  Github!: string;
  @Field(() => Boolean)
  WantsAwardEmails!: boolean;
  @Field(() => Boolean)
  WantsDigestEmails!: boolean;
}

// The whole profile, every time. A partial update would need a way to say
// "leave this one alone" that an empty string cannot carry, and the form this
// serves submits all of it anyway.
@InputType()
export class UserProfileInput {
  @Field(() => String)
  FirstName!: string;
  @Field(() => String)
  LastName!: string;
  @Field(() => String)
  NickName!: string;
  @Field(() => String)
  Designation!: string;
  @Field(() => String)
  Biography!: string;
  @Field(() => String)
  Language!: string;
  @Field(() => String)
  Gender!: string;
  // Empty means "not given"; the API's schema refuses anything that is not a
  // real day in the past.
  @Field(() => String)
  BirthDate!: string;
  @Field(() => String)
  Phone!: string;
  @Field(() => String)
  Address!: string;
  @Field(() => String)
  Twitter!: string;
  @Field(() => String)
  Facebook!: string;
  @Field(() => String)
  LinkedIn!: string;
  @Field(() => String)
  Github!: string;
  @Field(() => Boolean)
  WantsAwardEmails!: boolean;
  @Field(() => Boolean)
  WantsDigestEmails!: boolean;
}
