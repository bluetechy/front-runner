import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  CurrentUser,
  Public,
  type Principal,
} from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { EmailSettings, UserEmail, VerifiedEmail } from "./emails.model.js";
import { emailSchema, verificationTokenSchema } from "./emails.schema.js";
import { EmailsService } from "./emails.service.js";

// Your own addresses, and nobody else's. None of these takes a user: the login
// name comes from the verified token, so there is no way to name somebody
// else's list, and the database checks ownership again regardless.
//
// The exception is verifyEmail, which is @Public and has to be: the link in a
// verification mail is followed by whoever opens that mailbox, and that is
// exactly the thing being proved. Requiring a session would refuse the case
// this feature exists for, somebody adding an address at work and reading it
// at home. The token is the authorization, which is why it is unguessable and
// why it is spent on first use.
@Resolver(() => UserEmail)
export class EmailsResolver {
  constructor(private readonly service: EmailsService) {}

  @Query(() => EmailSettings)
  emailSettings(@CurrentUser() user: Principal) {
    return this.service.settings(user.loginName);
  }

  // The three writes that change the list all answer with the whole of it,
  // the way the wallet's do: every one of them can move something else. The
  // page replaces its list rather than working out what else changed.
  @Mutation(() => [UserEmail])
  async addEmail(
    @CurrentUser() user: Principal,
    @Args("email", { type: () => String }, new ZodPipe(emailSchema))
    email: string,
  ) {
    const { addresses } = await this.service.add(user.loginName, email);
    return addresses;
  }

  @Mutation(() => [UserEmail])
  removeEmail(
    @CurrentUser() user: Principal,
    @Args("userEmailId", { type: () => String }, new ParseUUIDPipe())
    userEmailId: string,
  ) {
    return this.service.remove(user.loginName, userEmailId);
  }

  @Mutation(() => [UserEmail])
  setPrimaryEmail(
    @CurrentUser() user: Principal,
    @Args("userEmailId", { type: () => String }, new ParseUUIDPipe())
    userEmailId: string,
  ) {
    return this.service.setPrimary(user.loginName, userEmailId);
  }

  @Mutation(() => [UserEmail])
  async resendEmailVerification(
    @CurrentUser() user: Principal,
    @Args("userEmailId", { type: () => String }, new ParseUUIDPipe())
    userEmailId: string,
  ) {
    const { addresses } = await this.service.resend(
      user.loginName,
      userEmailId,
    );
    return addresses;
  }

  @Mutation(() => EmailSettings)
  setEmailPrivacy(
    @CurrentUser() user: Principal,
    @Args("isPrivate", { type: () => Boolean }) isPrivate: boolean,
  ) {
    return this.service.setPrivacy(user.loginName, isPrivate);
  }

  // See the note on the class. The token is the whole of the authorization.
  @Public()
  @Mutation(() => VerifiedEmail)
  verifyEmail(
    @Args("token", { type: () => String }, new ZodPipe(verificationTokenSchema))
    token: string,
  ) {
    return this.service.verify(token);
  }
}
