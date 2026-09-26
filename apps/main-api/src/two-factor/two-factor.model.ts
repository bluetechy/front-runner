import { Field, GraphQLISODateTime, ObjectType } from "@nestjs/graphql";

// The second factors an account can put in front of its password, and the
// codes that get somebody back in when one of them is gone.
//
// Two shapes, because they are two cards on the security page and two
// different things: a factor is a way of proving it is you, and a recovery
// code is what you spend when you cannot.

// One row on the TWO-FACTOR AUTHENTICATION card.
//
// Every kind this product offers is a row whether or not it is configured and
// whether or not it works here, which is the arrangement SignInMethod already
// has: "we do not do SMS" and "SMS is not switched on in this installation"
// are the same row to somebody reading the page and a different thing to
// whoever has to fix it.
@ObjectType()
export class TwoFactorMethod {
  // What addresses this row everywhere: the mutations take it, the browser
  // picks an icon with it. This product's word rather than the identity
  // provider's -- Keycloak calls the first one an "otp" credential, and the
  // page is not a list of credential types.
  @Field(() => String)
  Kind!: string;
  @Field(() => String)
  Name!: string;
  // Whether this installation can actually use it today. False for SMS until
  // the messages have somewhere to go, the same way a login provider with
  // placeholder credentials is answered but not offered.
  @Field(() => Boolean)
  Available!: boolean;
  @Field(() => Boolean)
  Configured!: boolean;
  // When it was set up, where the provider says. Null on a row that is not
  // configured, and on one the provider would not date.
  @Field(() => GraphQLISODateTime, { nullable: true })
  ConfiguredAt!: Date | null;
  // What it was called where it was set up ("iPhone"), which is how somebody
  // with two authenticator apps knows which row is which. Null wherever
  // nobody was asked for a name.
  @Field(() => String, { nullable: true })
  Label!: string | null;
  // Whether this product recommends it. False for SMS, which the card marks
  // Less secure and says why: messages can be intercepted, numbers can be
  // taken over, and delivery is nobody's promise. It is a judgment rather than
  // a fact about the account, and it is made here so that the two clients this
  // API may grow cannot disagree about it.
  @Field(() => Boolean)
  Recommended!: boolean;
}

// A text message is on its way, and this is what the dialog says while it
// waits for the six digits back.
//
// The number in it is masked. It is the number that was just typed into the
// box above, so there is nothing here the person does not already know -- but
// it is read back to them as the account will hold it, which is how somebody
// who mistyped a digit finds out before they are waiting for a message that is
// never coming.
@ObjectType()
export class PhoneEnrollment {
  @Field(() => String)
  PhoneNumber!: string;
  @Field(() => GraphQLISODateTime)
  SentAt!: Date;
}

// What the RECOVERY CODES card shows.
//
// No code is in it and none ever will be: the codes exist in one answer, to
// the mutation that made them, and after that this API holds hashes. An
// account that has lost the paper makes ten new ones.
@ObjectType()
export class RecoveryCodeStatus {
  @Field(() => Number)
  Remaining!: number;
  @Field(() => Number)
  Total!: number;
  // When the set was made. Null for an account that has never made one, which
  // is the state the card draws as "none yet".
  @Field(() => GraphQLISODateTime, { nullable: true })
  GeneratedAt!: Date | null;
}

// A new set of codes, the once.
//
// This is the only answer in this API that carries a secret out of it, and it
// is the only way these codes can work at all: they are written down hashed,
// so nothing -- not this API, not the database, not a support request -- can
// show them a second time. The card says so beside them.
@ObjectType()
export class GeneratedRecoveryCodes {
  @Field(() => [String])
  Codes!: string[];
  @Field(() => RecoveryCodeStatus)
  Status!: RecoveryCodeStatus;
}

// What spending a recovery code ends with.
//
// It says what changed rather than answering a session: the account's second
// factors are gone, and the ordinary login with the ordinary password now
// works. The card reads this to say "two-factor authentication is off; turn it
// back on once you are in", which is the sentence that stops somebody
// believing they are still protected.
@ObjectType()
export class RecoveryCodeUse {
  @Field(() => Boolean)
  TwoFactorRemoved!: boolean;
  @Field(() => Number)
  Remaining!: number;
}
