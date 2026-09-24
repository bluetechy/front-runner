import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Public } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { PasswordReset, PasswordResetRequest } from "./password-reset.model.js";
import {
  identifierSchema,
  newPasswordSchema,
  resetTokenSchema,
} from "./password-reset.schema.js";
import { PasswordResetService } from "./password-reset.service.js";

// The two operations somebody who cannot login uses, and both are @Public
// because they have to be: not being able to login is the situation.
//
// That makes them worth being plain about. The first takes a name and answers
// the same thing whatever it is given, so it cannot be used to find out who
// has an account here; what it may do is send one message to an address this
// system already holds. The second takes a one-time token that was only ever
// written into that message, and its authorization is the ability to read the
// mailbox -- the same argument dbo.VerifyUserEmail rests on, and the reason
// the token is unguessable, short-lived and spent on first use.
//
// Neither answers with a session. Logging in stays the ordinary act it is,
// with the password that was just chosen.
@Resolver(() => PasswordReset)
export class PasswordResetResolver {
  constructor(private readonly service: PasswordResetService) {}

  @Public()
  @Mutation(() => PasswordResetRequest)
  requestPasswordReset(
    @Args("identifier", { type: () => String }, new ZodPipe(identifierSchema))
    identifier: string,
  ) {
    return this.service.request(identifier);
  }

  // Two arguments rather than one input, so that a refusal names the box it
  // is about: ZodPipe prefixes a path only when the schema is an object, and
  // "A password needs at least 8 characters" reads better than
  // "Password: A password needs at least 8 characters" under one field.
  @Public()
  @Mutation(() => PasswordReset)
  resetPassword(
    @Args("token", { type: () => String }, new ZodPipe(resetTokenSchema))
    token: string,
    @Args("password", { type: () => String }, new ZodPipe(newPasswordSchema))
    password: string,
  ) {
    return this.service.reset(token, password);
  }
}
