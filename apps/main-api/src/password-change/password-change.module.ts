import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { PasswordResetModule } from "../password-reset/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { PasswordChangeResolver } from "./password-change.resolver.js";
import { PasswordChangeService } from "./password-change.service.js";

// A vertical of its own rather than two more operations on the password-reset
// one, and the reason is the direction the imports run.
//
// A password change has to be recorded, and the security log is written through
// SecurityEventsService. That vertical already imports PasswordResetModule,
// because "No, secure account" sends the person a reset link; a change living
// in the reset vertical would have to import the security vertical back, and
// two modules importing each other is a cycle Nest would need forwardRef to
// untangle. This way every arrow runs one direction: change reaches reset for
// the rule a new password keeps, change reaches the security log to write to
// it, and neither of those reaches back.
//
// The subject is different too, which is the better half of the argument.
// Forgetting a password is something that happens to somebody who cannot get
// in, and both of its operations are @Public for that reason. Changing one is
// something an account does to itself from a page behind the login.
//
// Nothing is exported. This is reached through the schema and nowhere else,
// which is the rule every vertical here keeps but the two that had a reason
// not to.
@Module({
  imports: [AuthenticationModule, PasswordResetModule, SecurityEventsModule],
  providers: [PasswordChangeResolver, PasswordChangeService],
})
export class PasswordChangeModule {}
