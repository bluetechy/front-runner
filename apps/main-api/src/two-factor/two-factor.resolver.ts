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
  PhoneEnrollment,
  RecoveryCodeStatus,
  RecoveryCodeUse,
  TwoFactorMethod,
} from "./two-factor.model.js";
import {
  kindSchema,
  phoneNumberSchema,
  recoveryCodeSchema,
  verificationCodeSchema,
} from "./two-factor.schema.js";
import { TwoFactorService } from "./two-factor.service.js";

// Seven operations about the second thing an account is asked for, and one of
// them is not like the others.
//
// Six are questions about the account the token names, asked from a page
// behind the login: what it has, what it has just turned on, turning one off,
// the two halves of attaching a phone number, and a fresh set of recovery
// codes.
//
// `useRecoveryCode` is @Public, and it has to be: being unable to login is the
// situation it exists for. What keeps that safe is written into it -- it takes
// the password as well as the code, it answers one sentence however it fails,
// and it hands back no session. It is the same argument the password-reset
// pair rests on, and see the service for the rest of it.
//
// There is no enableTwoFactorMethod, and its absence is the design. Turning on
// an authenticator app ends at the identity provider's own setup page, in a
// browser, because the secret behind one is minted there and shown to a person
// once. A mutation named enable would be a mutation that could not enable
// anything.
//
// The two SMS operations are what that looks like for a factor with no secret
// to mint. There is nothing to show and nothing to scan: there is a number,
// and the only question about it is whether the person setting it up can
// answer a message sent to it. So it is a pair rather than a redirect -- send,
// then prove -- and it is two mutations rather than one because the ten
// minutes in between belong to somebody walking to where they left their
// phone.
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

  // Sends a code to a number nobody has proved yet, which is why it writes
  // nothing onto the account: see the service.
  @Mutation(() => PhoneEnrollment)
  startSmsEnrollment(
    @CurrentUser() principal: Principal,
    @Args("phoneNumber", { type: () => String }, new ZodPipe(phoneNumberSchema))
    phoneNumber: string,
  ) {
    return this.service.startSmsEnrollment(principal, phoneNumber);
  }

  // Takes the code and nothing else. The number the code proves is read off
  // the row it was sent against, never off this request.
  @Mutation(() => [TwoFactorMethod])
  confirmSmsEnrollment(
    @CurrentUser() principal: Principal,
    @Args("code", { type: () => String }, new ZodPipe(verificationCodeSchema))
    code: string,
  ) {
    return this.service.confirmSmsEnrollment(principal, code);
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
