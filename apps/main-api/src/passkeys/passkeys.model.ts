import { Field, GraphQLISODateTime, ObjectType } from "@nestjs/graphql";

// A passkey an account can login with instead of typing a password.
//
// One shape, and a short one, because there is very little about a passkey
// that this API is allowed to know. The secret half never leaves the
// authenticator that made it -- a laptop's fingerprint reader, a phone, a key
// on a keyring -- and the public half is of no use to a page. What is left is
// what a person needs to tell one row from another: the name they gave it and
// the day they registered it.
@ObjectType()
export class Passkey {
  // The identity provider's handle for it, and the only field here that is
  // not for reading: removePasskey is addressed by it. Opaque on purpose --
  // the page carries it back unread, and nothing in this API parses it.
  @Field(() => String)
  Id!: string;
  // What it was named where it was registered ("MacBook Touch ID"), which is
  // the whole of what tells two rows apart. Null wherever nobody was asked
  // for a name, which the card draws as an unnamed key rather than as a blank.
  @Field(() => String, { nullable: true })
  Label!: string | null;
  // When it was registered, where the provider says. Null on one the provider
  // would not date.
  @Field(() => GraphQLISODateTime, { nullable: true })
  CreatedAt!: Date | null;
}

// What came of the trip to the provider's registration page.
//
// The rows as they now are, and whether one of them is new. The second is
// separate rather than something the page works out by counting, because the
// page cannot: it left, and the list it remembers is from before it went.
//
// The distinction is the whole message. Somebody who abandoned the ceremony
// comes back to this route exactly as somebody who finished it does, and
// "your passkey is ready" said to the first of them is a person who will
// never find out that nothing was saved.
@ObjectType()
export class PasskeyRegistration {
  @Field(() => Boolean)
  Registered!: boolean;
  @Field(() => [Passkey])
  Passkeys!: Passkey[];
}
