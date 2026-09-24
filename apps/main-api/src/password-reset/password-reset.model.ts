import { Field, ObjectType } from "@nestjs/graphql";

// Forgetting a password, in two acts: asking for a link, and following it.
//
// Neither of these answers carries anything about the account that the caller
// did not already have. That is the whole design of the first one and half of
// the second: an answer that said "yes, that person is here" would make the
// forgot-password form the easiest way in the product to find out who has an
// account.

// What asking for a link ends with.
//
// It echoes back what was asked about and says nothing else, on purpose. A
// request for an account that does not exist and one for an account that does
// are answered identically, so the card can only say "if that matches an
// account, a link is on its way" -- which is also exactly what it does say.
@ObjectType()
export class PasswordResetRequest {
  @Field(() => String)
  Identifier!: string;
}

// What following the link ends with.
//
// The login name, because it is useful and because it is not a leak: this is
// answered only to whoever opened the mailbox and spent a one-time token from
// it, which is the account's owner. Somebody who has forgotten their password
// has often forgotten which of their names they login with, and this is the
// one moment in the product where telling them costs nothing.
@ObjectType()
export class PasswordReset {
  @Field(() => String)
  LoginName!: string;
}
