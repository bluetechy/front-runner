import { Field, ObjectType, ID, GraphQLISODateTime } from "@nestjs/graphql";

// The security page's address list, and the one setting that sits under it.
//
// There is no verification token in either direction, and there never will
// be. It is the secret from the link in a verification mail, it is what makes
// following that link proof of anything, and a browser has no use for it:
// dbo.GetUserEmails does not return it either. See
// apps/main-db/sql/Tables/UserEmails.sql.

// One address on file.
@ObjectType()
export class UserEmail {
  @Field(() => ID)
  UserEmailUUID!: string;
  // Always folded to lower case and trimmed: that is how it is stored, and
  // the table's check constraint is what makes that true rather than hopeful.
  @Field(() => String)
  Email!: string;
  // The address this account signs in with. Exactly one per account carries
  // it; dbo.SetPrimaryUserEmail is what keeps that true.
  @Field(() => Boolean)
  IsPrimary!: boolean;
  // Whether somebody has followed a link sent to this address, or whether
  // Keycloak vouched for it at a sign-in. The derived half of "VerifiedAt",
  // returned beside it because a status column asks the first and a sentence
  // saying when asks the second.
  @Field(() => Boolean)
  IsVerified!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true })
  VerifiedAt!: Date | null;
  @Field(() => GraphQLISODateTime)
  CreatedAt!: Date;
}

// What the security page reads in one query: the list, and the switch under
// it. They are two tables and two functions in the database, and one object
// here because they are one screen and asking twice would be two round trips
// for one page.
@ObjectType()
export class EmailSettings {
  @Field(() => [UserEmail])
  Addresses!: UserEmail[];
  // "Keep my email addresses private". What it does is withhold the address
  // from the members list other people in your organizations read; see
  // dbo.GetOrganizationMembers.
  @Field(() => Boolean)
  EmailIsPrivate!: boolean;
}

// What following a verification link ends with. It carries the address so the
// page can say which one was confirmed, and nothing else about the account:
// this is answered to whoever opened the link, which is the thing being
// proved and is not necessarily a signed-in session.
@ObjectType()
export class VerifiedEmail {
  @Field(() => String)
  Email!: string;
}
