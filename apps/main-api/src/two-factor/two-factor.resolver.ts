import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  CurrentUser,
  Public,
  type Principal,
} from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { identifierSchema } from "../password-reset/index.js";
import {
  GeneratedRecoveryCodes,
  RecoveryCodeStatus,
  RecoveryCodeUse,
  TwoFactorMethod,
} from "./two-factor.model.js";
import { kindSchema, recoveryCodeSchema } from "./two-factor.schema.js";
import { TwoFactorService } from "./two-factor.service.js";

// Five operations about the second thing an account is asked for, and one of
// them is not like the others.
//
// Four are questions about the account the token names, asked from a page
// behind the login: what it has, what it has just turned on, turning one off,
// and a fresh set of recovery codes.
//
// `useRecoveryCode` is @Public, and it has to be: being unable to login is the
// situation it exists for. What keeps that safe is written into it -- it takes
// the password as well as the code, it answers one sentence however it fails,
// and it hands back no session. It is the same argument the password-reset
// pair rests on, and see the service for the rest of it.
//
// There is no enableTwoFactorMethod, and its absence is the design. Turning
// one on ends at the identity provider's own setup page, in a browser, because
// the secret behind an authenticator app is minted there and shown to a person
// once. A mutation named enable would be a mutation that could not enable
// anything.
@Resolver(() => TwoFactorMethod)
export class TwoFactorResolver {
  constructor(private readonly service: TwoFactorService) {}

  @Query(() => [TwoFactorMethod])
  twoFactorMethods(@CurrentUser() principal: Principal) {
    return this.service.methods(principal);
  }

  @Query(() => RecoveryCodeStatus)
  recoveryCodes(@CurrentUser() principal: Principal) {
    return this.service.recoveryCodes(principal);
  }

  // Called when the browser comes back from the provider saying it worked.
  // The kind is a hint about what to go and ask, never a fact to write down:
  // the service records nothing the provider does not confirm.
  @Mutation(() => [TwoFactorMethod])
  confirmTwoFactorMethod(
    @CurrentUser() principal: Principal,
    @Args("kind", { type: () => String }, new ZodPipe(kindSchema))
    kind: string,
  ) {
    return this.service.confirm(principal, kind);
  }

  @Mutation(() => [TwoFactorMethod])
  disableTwoFactorMethod(
    @CurrentUser() principal: Principal,
    @Args("kind", { type: () => String }, new ZodPipe(kindSchema))
    kind: string,
  ) {
    return this.service.disable(principal, kind);
  }

  @Mutation(() => GeneratedRecoveryCodes)
  generateRecoveryCodes(@CurrentUser() principal: Principal) {
    return this.service.generateRecoveryCodes(principal);
  }

  // Three arguments rather than one input, so that a refusal names the box it
  // is about, the way resetPassword takes two. Not that it matters much here:
  // every refusal is the same sentence, deliberately.
  //
  // The identifier schema is the forgot-password card's own, imported rather
  // than restated: these two forms ask for the same thing in the same words,
  // and two copies of that rule would be two chances to fold a name
  // differently and look an account up that is not there.
  @Public()
  @Mutation(() => RecoveryCodeUse)
  useRecoveryCode(
    @Args("identifier", { type: () => String }, new ZodPipe(identifierSchema))
    identifier: string,
    @Args("password", { type: () => String }) password: string,
    @Args("code", { type: () => String }, new ZodPipe(recoveryCodeSchema))
    code: string,
  ) {
    return this.service.useRecoveryCode(identifier, password, code);
  }
}
