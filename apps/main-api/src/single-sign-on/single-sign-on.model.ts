import { Field, ObjectType } from "@nestjs/graphql";

// One other place an account can login from, and where it stands with this
// account.
//
// A row on the security page's SINGLE SIGN-ON (SSO) card, and the only shape
// that card is drawn from. Every provider the realm has is one of these
// whether or not anybody has connected it, because the card is a list of what
// is on offer as much as a list of what is on.
@ObjectType()
export class SignInMethod {
  // The identity provider's alias at the realm: "google", "apple". Everything
  // is addressed by it -- the connect flow, the disconnect mutation, the icon
  // the browser picks -- and it is the one field here that is not for reading.
  @Field(() => String)
  Alias!: string;
  // What to call it on the page. The realm's own display name where it has
  // one, which is why "apple" reads as "Apple ID", and the alias where it has
  // none. Never composed here out of the alias: the browser knows how to draw
  // the handful it ships icons for and falls back to this for the rest.
  @Field(() => String)
  Name!: string;
  // Whether the realm will actually let somebody login with it today. False
  // for a provider that is configured and switched off, and for one sitting
  // there with placeholder credentials, which is every provider on a fresh
  // installation of this realm.
  //
  // A row is drawn either way. "We do not offer Google" and "Google is off
  // this week" look the same to somebody reading the page and are not the same
  // thing, and an account that connected Google before it was switched off
  // still has it connected.
  @Field(() => Boolean)
  Available!: boolean;
  @Field(() => Boolean)
  Connected!: boolean;
  // What the account is called over there, where the provider says: the Google
  // address, the relay address Apple issues. Null on a row that is not
  // connected, and on one the provider would not name.
  @Field(() => String, { nullable: true })
  ConnectedAs!: string | null;
  // Whether offering Disconnect on this row is safe.
  //
  // False on every row that is not connected, and on the one connected
  // provider of an account that has no password: taking that away would leave
  // somebody outside their own account with nothing to knock with. The API
  // refuses it as well -- this is what stops the button being drawn, not what
  // stops the disconnection.
  @Field(() => Boolean)
  CanDisconnect!: boolean;
}
