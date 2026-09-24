import { Field, GraphQLISODateTime, Int, ObjectType } from "@nestjs/graphql";

// Changing a password from inside the account, which is a different act from
// the reset next door and answers different things.
//
// A reset is for somebody who cannot get in: it proves nothing about who is
// asking, so it says nothing back. This one is asked by a session that is
// already open and by somebody who has just produced the password the account
// has now, so it is allowed to be plain about what happened.

// What the card knows before anybody types anything.
//
// One date, which is what the section's stamp shows. Null where the identity
// provider will not say when the password was last set -- an outage, or a
// provider that does not keep that. The card leaves the line out rather than
// inventing a date, because "never" and "we could not ask" are different
// answers and only one of them is ever true here.
@ObjectType()
export class PasswordStatus {
  @Field(() => GraphQLISODateTime, { nullable: true })
  ChangedAt!: Date | null;
}

// What changing it ends with.
//
// The new stamp, so the card can redraw its own line without asking again, and
// how many other sessions were ended along with it -- which is a thing that
// happened to the account and has to be said rather than done quietly.
//
// That count is nullable, and the difference matters. Zero is "there were no
// other sessions", which is the ordinary answer and worth showing as
// reassurance. Null is "the password changed and we could not then say what
// happened to the sessions", which is the one case the card must not report as
// zero: somebody told nothing was open would stop looking.
@ObjectType()
export class PasswordChange {
  @Field(() => GraphQLISODateTime, { nullable: true })
  ChangedAt!: Date | null;
  @Field(() => Int, { nullable: true })
  OtherSessionsEnded!: number | null;
}
