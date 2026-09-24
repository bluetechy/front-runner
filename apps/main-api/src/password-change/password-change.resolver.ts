import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { newPasswordSchema } from "../password-reset/index.js";
import { PasswordChange, PasswordStatus } from "./password-change.model.js";
import { currentPasswordSchema } from "./password-change.schema.js";
import { PasswordChangeService } from "./password-change.service.js";

// The two operations an account uses on its own password, and neither is
// @Public -- which is the difference between this vertical and the reset one
// next door. Not being able to login is that one's situation; this one is
// asked by a session that is already open.
//
// @CurrentUser is where the account comes from, and it is the only place it
// may come from. Nothing here takes a login name, a subject or a user id off
// the request: an operation that let a caller name the account whose password
// it was changing would be the way into every account on the installation.
@Resolver(() => PasswordStatus)
export class PasswordChangeResolver {
  constructor(private readonly service: PasswordChangeService) {}

  @Query(() => PasswordStatus)
  passwordStatus(@CurrentUser() principal: Principal) {
    return this.service.status(principal);
  }

  // Two arguments rather than one input, the way resetPassword takes two: a
  // ZodPipe only prefixes a path when the schema is an object, and "Enter the
  // password you use now" reads better under a box than "CurrentPassword:
  // Enter the password you use now".
  //
  // The confirmation box is not an argument, because it is not a fact about
  // the password. It is a typing aid, it is only meaningful next to the box
  // above it, and the browser is where the two are compared.
  @Mutation(() => PasswordChange)
  changePassword(
    @CurrentUser() principal: Principal,
    @Args(
      "currentPassword",
      { type: () => String },
      new ZodPipe(currentPasswordSchema),
    )
    currentPassword: string,
    @Args("newPassword", { type: () => String }, new ZodPipe(newPasswordSchema))
    newPassword: string,
  ) {
    return this.service.change(principal, currentPassword, newPassword);
  }
}
