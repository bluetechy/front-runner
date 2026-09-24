import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { MailModule } from "../mail/index.js";
import { PasswordResetResolver } from "./password-reset.resolver.js";
import { PasswordResetService } from "./password-reset.service.js";

// The service is exported as well as resolved, which most verticals here do
// not do. "No, secure account" on the security page sends the person a link to
// choose a new password, and that is this flow exactly: the same token, the
// same message, the same page at the end of it. A second copy of it living in
// the security vertical would be a second way to reset a password.
@Module({
  imports: [DatabaseModule, MailModule, AuthenticationModule],
  providers: [PasswordResetResolver, PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
