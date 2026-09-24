import { Field, InputType, ObjectType } from "@nestjs/graphql";

// Making an account from the site's own sign-up form.
//
// The fields are Keycloak's registration page's, because that page is what
// this replaces and the realm asks for the same six things: registration does
// not use the address as the username here, so both are given. See
// apps/keycloak-idp/realm/front-runner-realm.json.

// What the form sends. One input rather than six arguments: it is one form,
// and every field of it is required for the account to exist at all.
@InputType()
export class RegistrationInput {
  @Field(() => String)
  Username!: string;
  @Field(() => String)
  Email!: string;
  @Field(() => String)
  FirstName!: string;
  @Field(() => String)
  LastName!: string;
  // Never answered back, never stored here, and never logged: it is handed to
  // Keycloak in the same request it arrived in and then it is gone.
  @Field(() => String)
  Password!: string;
}

// What making an account ends with.
//
// No token and no session: the account exists, and signing in is a separate
// act with the password the browser still has. Answering with a session here
// would mean this mutation minting one, and minting sessions is Keycloak's
// job -- the dialog signs in the ordinary way the moment this returns.
//
// The two fields it does answer are the two the caller could not have
// normalized itself: the username and address as they were actually stored.
@ObjectType()
export class RegisteredAccount {
  @Field(() => String)
  Username!: string;
  @Field(() => String)
  Email!: string;
}
