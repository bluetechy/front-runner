import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { SignInMethod } from "./single-sign-on.model.js";
import { aliasSchema } from "./single-sign-on.schema.js";
import { SingleSignOnService } from "./single-sign-on.service.js";

// One read and two writes, none of them @Public: every one is a question about
// the account the token names, asked from a page behind the login.
//
// There is no connectSignInMethod, and its absence is the design. Connecting
// is a redirect flow that ends at Google with a browser, so what this API can
// do about it is confirm afterwards -- see the service. A mutation named
// connect would be a mutation that could not connect anything.
@Resolver(() => SignInMethod)
export class SingleSignOnResolver {
  constructor(private readonly service: SingleSignOnService) {}

  @Query(() => [SignInMethod])
  signInMethods(@CurrentUser() principal: Principal) {
    return this.service.methods(principal);
  }

  @Mutation(() => [SignInMethod])
  disconnectSignInMethod(
    @CurrentUser() principal: Principal,
    @Args("alias", { type: () => String }, new ZodPipe(aliasSchema))
    alias: string,
  ) {
    return this.service.disconnect(principal, alias);
  }

  // Called when the browser comes back from the provider saying it worked.
  // The alias is a hint about what to go and ask, never a fact to write down:
  // the service records nothing the provider does not confirm.
  @Mutation(() => [SignInMethod])
  confirmSignInMethod(
    @CurrentUser() principal: Principal,
    @Args("alias", { type: () => String }, new ZodPipe(aliasSchema))
    alias: string,
  ) {
    return this.service.confirm(principal, alias);
  }
}
