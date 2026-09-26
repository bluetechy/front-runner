import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { Passkey, PasskeyRegistration } from "./passkeys.model.js";
import { passkeyIdSchema } from "./passkeys.schema.js";
import { PasskeysService } from "./passkeys.service.js";

// Three operations about the thing an account can login with instead of a
// password: what it has, what it has just registered, and taking one off.
//
// All three are questions about the account the token names, asked from a
// page behind the login. None of them is public, and the middle one is the
// reason that is worth saying out loud: `confirmPasskey` is called by a
// browser coming back from the provider, which looks like an unauthenticated
// moment and is not one. The trip goes through the provider's authorize
// endpoint and comes back with a session, and this is asked with the token
// that session minted.
//
// There is no registerPasskey, and its absence is the design. A passkey is
// made by the authenticator in somebody's hands, against the origin the
// provider is served from; a mutation named register would be a mutation
// that could not register anything.
@Resolver(() => Passkey)
export class PasskeysResolver {
  constructor(private readonly service: PasskeysService) {}

  @Query(() => [Passkey])
  passkeys(@CurrentUser() principal: Principal) {
    return this.service.list(principal);
  }

  // Called when the browser comes back from the provider saying it worked.
  // It takes no argument at all, and that is the shape: there is nothing the
  // page could tell this call that it would be right to believe. What is on
  // the URL says a trip happened; what the provider holds says what came of
  // it.
  @Mutation(() => PasskeyRegistration)
  confirmPasskey(@CurrentUser() principal: Principal) {
    return this.service.confirm(principal);
  }

  @Mutation(() => [Passkey])
  removePasskey(
    @CurrentUser() principal: Principal,
    @Args("id", { type: () => String }, new ZodPipe(passkeyIdSchema))
    id: string,
  ) {
    return this.service.remove(principal, id);
  }
}
